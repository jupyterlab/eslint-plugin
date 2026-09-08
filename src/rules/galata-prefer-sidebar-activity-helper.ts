/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  matchSelectorInteraction,
  resolveLocatorBinding,
  SelectorInteractionMatch
} from '../utils/playwright-selectors';

type MessageIds = 'preferSidebarHelper' | 'preferActivityHelper';
type Options = [];

interface SelectorSource {
  /**
   * The interaction call, used as the report anchor. The sibling
   * `galata-prefer-*-helper` rules report on the call too, so a
   * `// eslint-disable-next-line` above the statement suppresses all of them
   * even when the locator chain is written across several lines.
   */
  node: TSESTree.CallExpression;
  kind: 'selector' | 'title';
  value: string;
}

interface SidebarTab {
  id: string;
  /**
   * The side JupyterLab adds the panel to, from the `shell.add` call in the
   * owning extension. A test can move a tab, and `page.sidebar.close` takes a
   * side rather than a tab id, so the message names the default.
   */
  side: 'left' | 'right';
}

const SIDEBAR_TITLE_TO_TAB = new Map<string, SidebarTab>([
  ['Debugger', { id: 'jp-debugger-sidebar', side: 'right' }],
  ['Extension Manager', { id: 'extensionmanager.main-view', side: 'left' }],
  ['File Browser', { id: 'filebrowser', side: 'left' }],
  ['Property Inspector', { id: 'jp-property-inspector', side: 'right' }],
  [
    'Running Terminals and Kernels',
    { id: 'jp-running-sessions', side: 'left' }
  ],
  ['Table of Contents', { id: 'table-of-contents', side: 'left' }]
]);

// Options that change only how long Playwright waits, never what the gesture
// does, so the helper still reproduces it. Every other key changes it:
// `button` opens a context menu, `clickCount` opens and then closes the tab,
// `modifiers` makes a different gesture, `force` skips the actionability
// checks `openTab` relies on, and `position` aims at a point inside the tab.
const NEUTRAL_OPTION_KEYS: ReadonlySet<string> = new Set([
  'timeout',
  'noWaitAfter',
  'delay'
]);

/**
 * True when the click carries an option the sidebar and activity helpers
 * cannot reproduce, so that only the plain gesture is ever reported. A
 * computed key or a spread could carry any of them, so both count as
 * unsupported.
 */
function hasUnsupportedOptions(node: TSESTree.CallExpression): boolean {
  for (const arg of node.arguments) {
    if (arg.type !== 'ObjectExpression') {
      continue;
    }
    for (const prop of arg.properties) {
      if (prop.type === 'SpreadElement' || prop.computed) {
        return true;
      }
      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'Literal'
            ? prop.key.value
            : null;
      if (typeof key !== 'string' || !NEUTRAL_OPTION_KEYS.has(key)) {
        return true;
      }
    }
  }
  return false;
}

const TITLE_ATTRIBUTE_PATTERN =
  /\[\s*title\s*=\s*(?:"([^"]+)"|'([^']+)')\s*\]/g;
const MAIN_AREA_PATTERN =
  /(?:^|[\s>])(?:div)?\s*\[\s*role\s*=\s*(?:"main"|'main'|main)\s*\]/;
// The main area and the down area are Lumino tab bars too, so a widget moved
// out of the sidebar carries the same title attribute on its new tab. A
// selector that names one of those areas is not selecting a sidebar tab.
const DOCK_AREA_PATTERN = /#jp-main-dock-panel|#jp-down-stack/;
const TEXT_SELECTOR_PATTERN =
  /(?:^|>>)\s*text\s*=\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*(?:$|>>)/;
const ACTIVITY_TAB_SELECTOR_PATTERN =
  /(?:\[\s*role\s*=\s*(?:"tab"|'tab'|tab)\s*\]|\.lm-TabBar-tab(?:\b|[.:[\s>])|\.lm-TabBar-tabLabel(?:\b|[.:[\s>]))/;
const FILE_LIKE_ACTIVITY_NAME_PATTERN = /\.[A-Za-z0-9][\w-]*(?:\s*\*)?$/;

function getSelectorSource(
  match: SelectorInteractionMatch
): SelectorSource | null {
  if (
    match.interactionMethod !== 'click' ||
    hasUnsupportedOptions(match.callNode)
  ) {
    return null;
  }

  if (match.selectorParts.length !== 1) {
    return null;
  }

  const [part] = match.selectorParts;

  // `getByRole('tab', { name })` selects the same element as `[title="..."]`.
  // Lumino renders a tab as `<li role="tab" title="{caption}">`, and a sidebar
  // widget sets `title.caption` but no `title.label`, so the accessible name
  // falls back to that same caption.
  if (part.method === 'getByRole') {
    const role = extractStaticSelectorText(part.argNode, {
      allowPartialTemplate: false
    });
    if (role !== 'tab' || !part.nameArgNode) {
      return null;
    }
    const name = extractStaticSelectorText(part.nameArgNode, {
      allowPartialTemplate: false
    });
    return name === null
      ? null
      : { node: match.callNode, kind: 'title', value: name };
  }

  const selector = extractStaticSelectorText(part.argNode, {
    allowPartialTemplate: false
  });
  if (selector === null) {
    return null;
  }

  return {
    node: match.callNode,
    kind: part.method === 'getByTitle' ? 'title' : 'selector',
    value: selector
  };
}

function findSidebarTitle(
  source: SelectorSource
): (SidebarTab & { title: string }) | null {
  if (source.kind === 'title') {
    // `getByTitle` and `getByRole(..., { name })` both match on a substring of
    // normalized whitespace, so a caller may pad the name.
    const title = source.value.trim();
    const tab = SIDEBAR_TITLE_TO_TAB.get(title);
    return tab ? { title, ...tab } : null;
  }

  if (
    MAIN_AREA_PATTERN.test(source.value) ||
    DOCK_AREA_PATTERN.test(source.value)
  ) {
    return null;
  }

  for (const match of source.value.matchAll(TITLE_ATTRIBUTE_PATTERN)) {
    const title = match[1] ?? match[2];
    const tab = SIDEBAR_TITLE_TO_TAB.get(title);
    if (tab) {
      return { title, ...tab };
    }
  }

  return null;
}

function getActivityTabName(source: SelectorSource): string | null {
  if (source.kind !== 'selector' || !MAIN_AREA_PATTERN.test(source.value)) {
    return null;
  }

  const match = TEXT_SELECTOR_PATTERN.exec(source.value);
  if (!match) {
    return null;
  }

  const tabName = (match[1] ?? match[2] ?? match[3]).trim();
  if (tabName.length === 0) {
    return null;
  }

  if (
    !ACTIVITY_TAB_SELECTOR_PATTERN.test(source.value) &&
    !FILE_LIKE_ACTIVITY_NAME_PATTERN.test(tabName)
  ) {
    return null;
  }

  return tabName;
}

const galataPreferSidebarActivityHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-sidebar-activity-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata sidebar and activity helpers over raw Playwright tab selectors'
    },
    messages: {
      preferSidebarHelper:
        'Use page.sidebar.openTab("{{ id }}") to open the "{{ title }}" sidebar tab, or page.sidebar.close("{{ side }}"), its default side, if this click is closing the sidebar.',
      preferActivityHelper:
        'Use page.activity.activateTab("{{ tabName }}") instead of clicking a main area tab by text.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    function reportSelectorSource(source: SelectorSource): void {
      const sidebar = findSidebarTitle(source);
      if (sidebar) {
        context.report({
          node: source.node,
          messageId: 'preferSidebarHelper',
          data: { title: sidebar.title, id: sidebar.id, side: sidebar.side }
        });
        return;
      }

      const tabName = getActivityTabName(source);
      if (tabName) {
        context.report({
          node: source.node,
          messageId: 'preferActivityHelper',
          data: { tabName }
        });
      }
    }

    return {
      CallExpression(node) {
        // Most call expressions are not interactions at all, and
        // `matchSelectorInteraction` rejects them on the callee alone, so the
        // scope is looked up only once something actually needs it.
        let scope: TSESLint.Scope.Scope | null = null;
        const currentScope = (): TSESLint.Scope.Scope =>
          (scope ??= context.sourceCode.getScope(node));

        const match = matchSelectorInteraction(node, identifier =>
          resolveLocatorBinding(identifier, currentScope())
        );
        const source = match ? getSelectorSource(match) : null;
        if (source) {
          reportSelectorSource(source);
        }
      }
    };
  }
});

export = galataPreferSidebarActivityHelper;
