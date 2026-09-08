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

// Keyed by the start of the caption the widget puts in `title.caption`, which
// is what Lumino renders into the `title` attribute of the tab. Five of the six
// captions are exactly the key; the file browser appends its keyboard shortcut,
// so its caption reads `File Browser (Ctrl+Shift+F)`.
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

// Galata's own `buildTabSelector` picks a sidebar tab by `data-id`, so a test
// written against it names the id rather than the caption.
const SIDEBAR_ID_TO_TAB = new Map(
  [...SIDEBAR_TITLE_TO_TAB].map(([title, tab]) => [tab.id, { title, ...tab }])
);

const DATA_ID_ATTRIBUTE_PATTERN =
  /\[\s*data-id\s*=\s*(?:"([^"]+)"|'([^']+)')\s*\]/g;
// The operator is captured so that `[title^="File Browser"]`, which is how the
// file browser tab has to be selected once its caption carries the shortcut, is
// read as well as the exact form.
const TITLE_ATTRIBUTE_PATTERN =
  /\[\s*title\s*([~^$*|]?=)\s*(?:"([^"]+)"|'([^']+)')\s*\]/g;
const MAIN_AREA_PATTERN =
  /(?:^|[\s>])(?:div)?\s*\[\s*role\s*=\s*(?:"main"|'main'|main)\s*\]/;
// The main area and the down area are Lumino tab bars too, so a widget moved
// out of the sidebar carries the same title attribute on its new tab. A
// selector that names one of those areas is not selecting a sidebar tab.
const DOCK_AREA_PATTERN = /#jp-main-dock-panel|#jp-down-stack/;
const TEXT_SELECTOR_PATTERN =
  /(?:^|>>)\s*text\s*=\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*(?:$|>>)/;
const TEXT_IS_PATTERN = /:text-is\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/;
const ACTIVITY_TAB_SELECTOR_PATTERN =
  /(?:\[\s*role\s*=\s*(?:"tab"|'tab'|tab)\s*\]|\.lm-TabBar-tab(?:\b|[.:[\s>])|\.lm-TabBar-tabLabel(?:\b|[.:[\s>]))/;
const FILE_LIKE_ACTIVITY_NAME_PATTERN = /\.[A-Za-z0-9][\w-]*(?:\s*\*)?$/;

// The sidebar and the down area are Lumino tab bars too, so a tab token alone
// only proves a main area tab once these are ruled out.
const SIDE_TABBAR_PATTERN =
  /\.jp-SideBar|#jp-left-stack|#jp-right-stack|#jp-down-stack/;

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

/**
 * True when `[title <operator> "<value>"]` names the tab whose caption starts
 * with `title`.
 *
 * Only the three operators that the start of the caption settles are read.
 * `$=`, `~=` and `|=` are matched against its end, which the file browser
 * shortcut leaves unknown, so a selector using one of them is left alone. The
 * value has to fit inside the caption, never the other way round: a title such
 * as `Close Debugger` contains a caption without naming the tab that holds it.
 */
function titleValueNamesTab(
  operator: string,
  value: string,
  title: string
): boolean {
  switch (operator) {
    case '=':
      return value === title;
    case '^=':
      return title.startsWith(value);
    case '*=':
      return title.includes(value);
    default:
      return false;
  }
}

/**
 * The single sidebar tab an attribute value names, or null when it names none
 * or more than one. A short prefix such as `[title^="P"]` fits one caption and
 * is taken; one that fits two is dropped rather than resolved arbitrarily.
 */
function findTabByTitleAttribute(
  operator: string,
  value: string
): (SidebarTab & { title: string }) | null {
  let found: (SidebarTab & { title: string }) | null = null;
  for (const [title, tab] of SIDEBAR_TITLE_TO_TAB) {
    if (!titleValueNamesTab(operator, value, title)) {
      continue;
    }
    if (found) {
      return null;
    }
    found = { title, ...tab };
  }
  return found;
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
    const tab = findTabByTitleAttribute(match[1], match[2] ?? match[3]);
    if (tab) {
      return tab;
    }
  }

  for (const match of source.value.matchAll(DATA_ID_ATTRIBUTE_PATTERN)) {
    const tab = SIDEBAR_ID_TO_TAB.get(match[1] ?? match[2]);
    if (tab) {
      return tab;
    }
  }

  return null;
}

/** The text a selector matches on, written as `text=` or as `:text-is()`. */
function activityTextFrom(selector: string): string | null {
  const text = TEXT_SELECTOR_PATTERN.exec(selector);
  if (text) {
    return (text[1] ?? text[2] ?? text[3]).trim();
  }
  const exact = TEXT_IS_PATTERN.exec(selector);
  return exact ? (exact[1] ?? exact[2]).trim() : null;
}

function getActivityTabName(source: SelectorSource): string | null {
  if (source.kind !== 'selector') {
    return null;
  }

  const tabName = activityTextFrom(source.value);
  if (tabName === null || tabName.length === 0) {
    return null;
  }

  // A tab token proves the target is a tab wherever it is written. Without one
  // the only evidence is the main area plus a name shaped like a file, which
  // the dock panel node also covers the widget content with, so that path
  // stays the fallback.
  const namesTab =
    ACTIVITY_TAB_SELECTOR_PATTERN.test(source.value) &&
    !SIDE_TABBAR_PATTERN.test(source.value);
  const looksLikeADocumentInTheMainArea =
    MAIN_AREA_PATTERN.test(source.value) &&
    FILE_LIKE_ACTIVITY_NAME_PATTERN.test(tabName);

  return namesTab || looksLikeADocumentInTheMainArea ? tabName : null;
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
