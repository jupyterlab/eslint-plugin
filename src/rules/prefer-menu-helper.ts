/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';

type MessageIds = 'preferMenuHelper';
type Options = [];

const TOP_LEVEL_MENU_LABELS = new Set([
  'File',
  'Edit',
  'View',
  'Run',
  'Kernel',
  'Tabs',
  'Settings',
  'Help'
]);

const TOP_LEVEL_MENU_IDS = new Set(
  [...TOP_LEVEL_MENU_LABELS].map(label => label.toLowerCase())
);

const LOCATOR_CHAIN_METHODS = new Set([
  'filter',
  'first',
  'getByRole',
  'getByText',
  'last',
  'locator',
  'nth'
]);

const OPEN_LOCATOR_CHAIN_METHODS = new Set(['filter', 'first', 'last', 'nth']);

function getStaticString(node: TSESTree.Node | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(quasi => quasi.value.cooked ?? '').join('');
  }

  return null;
}

function getStaticSelectorParts(node: TSESTree.Node | undefined): string[] {
  const staticString = getStaticString(node);
  if (staticString !== null) {
    return [staticString];
  }

  if (node?.type === 'TemplateLiteral') {
    return node.quasis.map(quasi => quasi.value.cooked ?? '');
  }

  return [];
}

function getPropertyName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }

  if (node.computed) {
    return getStaticString(node.property);
  }

  return null;
}

function getObjectPropertyValue(
  node: TSESTree.Node | undefined,
  name: string
): TSESTree.Node | null {
  if (!node || node.type !== 'ObjectExpression') {
    return null;
  }

  for (const property of node.properties) {
    if (property.type !== 'Property') {
      continue;
    }

    const key =
      property.key.type === 'Identifier'
        ? property.key.name
        : getStaticString(property.key);
    if (key === name) {
      return property.value;
    }
  }

  return null;
}

function isPageMemberCall(
  node: TSESTree.CallExpression,
  methodName: string
): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'page' &&
    getPropertyName(callee) === methodName
  );
}

function getTextSelectorLabel(selector: string): string | null {
  const textSelector = selector
    .trim()
    .match(/^text\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'"].*))$/);

  return textSelector
    ? (textSelector[1] ?? textSelector[2] ?? textSelector[3]).trim()
    : null;
}

function isTopLevelMenuTextSelector(selector: string): boolean {
  const label = getTextSelectorLabel(selector);
  return label !== null && TOP_LEVEL_MENU_LABELS.has(label);
}

function isTopLevelMenuItemSelector(selector: string): boolean {
  const menuItemSelector = selector
    .trim()
    .match(
      /^li\[role\s*=\s*(?:"menuitem"|'menuitem'|menuitem)\]:has-text\((?:"([^"]+)"|'([^']+)')\)$/
    );

  if (!menuItemSelector) {
    return false;
  }

  const label = menuItemSelector[1] ?? menuItemSelector[2];
  return TOP_LEVEL_MENU_LABELS.has(label);
}

function isTopLevelMenuBarItemSelector(selector: string): boolean {
  const menuBarItemSelector = selector.match(
    /\.lm-MenuBar-itemLabel(?::text-is|:text)\((?:"([^"]+)"|'([^']+)')\)/
  );

  if (!menuBarItemSelector) {
    return false;
  }

  const label = menuBarItemSelector[1] ?? menuBarItemSelector[2];
  return TOP_LEVEL_MENU_LABELS.has(label);
}

function hasTopLevelMainMenuId(selector: string): boolean {
  for (const id of TOP_LEVEL_MENU_IDS) {
    const menuId = `#jp-mainmenu-${id}`;
    const index = selector.indexOf(menuId);
    if (index === -1) {
      continue;
    }

    const nextCharacter = selector[index + menuId.length];
    if (
      nextCharacter === undefined ||
      /[-\s>+~:.[#]/.test(nextCharacter)
    ) {
      return true;
    }
  }

  return false;
}

function isKnownTopLevelMainMenuSelector(
  selectorParts: string[],
  openerOnly = false
): boolean {
  const selector = selectorParts.join('').trim();
  return (
    (!openerOnly || !selector.includes('>>')) &&
    (hasTopLevelMainMenuId(selector) ||
      isTopLevelMenuTextSelector(selector) ||
      isTopLevelMenuItemSelector(selector) ||
      isTopLevelMenuBarItemSelector(selector))
  );
}

function isMainMenuSelector(selectorParts: string[]): boolean {
  const selector = selectorParts.join('');
  return (
    selector.includes('#jp-mainmenu-') ||
    isKnownTopLevelMainMenuSelector(selectorParts) ||
    isLuminoMenuSelector(selectorParts)
  );
}

function isLuminoMenuSelector(selectorParts: string[]): boolean {
  return (
    selectorParts.some(part => /\.lm-Menu\b/.test(part)) &&
    selectorParts.some(part =>
      /\[role\s*=\s*(?:"menu"|'menu'|menu)\]/.test(part)
    )
  );
}

function isGetByRoleCall(node: TSESTree.CallExpression, role: string): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    getPropertyName(callee) === 'getByRole' &&
    getStaticString(node.arguments[0]) === role
  );
}

function isMenuRoleLocatorExpression(
  node: TSESTree.Expression | TSESTree.PrivateIdentifier
): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  if (
    isPageMemberCall(node, 'getByRole') &&
    ['menu', 'menubar'].includes(getStaticString(node.arguments[0]) ?? '')
  ) {
    return true;
  }

  const { callee } = node;
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  const methodName = getPropertyName(callee);
  return (
    methodName !== null &&
    OPEN_LOCATOR_CHAIN_METHODS.has(methodName) &&
    isMenuRoleLocatorExpression(callee.object)
  );
}

function isMenuItemRoleCall(
  node: TSESTree.CallExpression,
  expectedLabel?: string | Set<string>
): boolean {
  if (!isGetByRoleCall(node, 'menuitem')) {
    return false;
  }

  const { callee } = node;
  if (
    !isPageMemberCall(node, 'getByRole') &&
    !(
      callee.type === 'MemberExpression' &&
      isMenuRoleLocatorExpression(callee.object)
    )
  ) {
    return false;
  }

  if (expectedLabel === undefined) {
    return true;
  }

  const name = getObjectPropertyValue(node.arguments[1], 'name');
  const label = getStaticString(name ?? undefined);
  return (
    label !== null &&
    (typeof expectedLabel === 'string'
      ? label === expectedLabel
      : expectedLabel.has(label))
  );
}

function isTopLevelMenuLocatorCall(node: TSESTree.CallExpression): boolean {
  if (isMenuItemRoleCall(node, TOP_LEVEL_MENU_LABELS)) {
    return true;
  }

  if (isPageMemberCall(node, 'getByText')) {
    const label = getStaticString(node.arguments[0]);
    return label !== null && TOP_LEVEL_MENU_LABELS.has(label);
  }

  return false;
}

function isFollowUpMenuItemSelector(selectorParts: string[]): boolean {
  const selector = selectorParts.join('');
  return (
    /li\[role\s*=\s*(?:"menuitem"|'menuitem'|menuitem)\]/.test(selector) ||
    /\.lm-Menu-item(?:Label)?\b/.test(selector)
  );
}

function isFollowUpSubmenuSelector(selectorParts: string[]): boolean {
  const selector = selectorParts.join('');
  return /li\[data-type\s*=\s*(?:"submenu"|'submenu'|submenu)\]/.test(
    selector
  );
}

function isContextSubmenuSelector(selectorParts: string[]): boolean {
  const selector = selectorParts.join('');
  return (
    isFollowUpSubmenuSelector(selectorParts) ||
    /text\s*=\s*(?:"Open With"|'Open With'|Open With)(?:$|\s|>)/.test(
      selector
    )
  );
}

function isContextSubmenuLocatorExpression(
  node: TSESTree.Expression | TSESTree.PrivateIdentifier
): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  if (isPageMemberCall(node, 'locator')) {
    return isContextSubmenuSelector(getStaticSelectorParts(node.arguments[0]));
  }

  const { callee } = node;
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  const methodName = getPropertyName(callee);
  if (
    isMenuItemRoleCall(node, 'Open With') ||
    (methodName === 'getByText' &&
      getStaticString(node.arguments[0]) === 'Open With')
  ) {
    return true;
  }

  if (
    methodName === 'locator' &&
    isContextSubmenuSelector(getStaticSelectorParts(node.arguments[0]))
  ) {
    return true;
  }

  return (
    methodName !== null &&
    LOCATOR_CHAIN_METHODS.has(methodName) &&
    isContextSubmenuLocatorExpression(callee.object)
  );
}

function isLuminoMenuLocatorExpression(
  node: TSESTree.Expression | TSESTree.PrivateIdentifier
): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  if (isPageMemberCall(node, 'locator')) {
    return isLuminoMenuSelector(getStaticSelectorParts(node.arguments[0]));
  }

  const { callee } = node;
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  const methodName = getPropertyName(callee);
  return (
    methodName !== null &&
    LOCATOR_CHAIN_METHODS.has(methodName) &&
    isLuminoMenuLocatorExpression(callee.object)
  );
}

const preferMenuHelper = createRule<Options, MessageIds>({
  name: 'prefer-menu-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata MenuHelper over raw Playwright selectors for JupyterLab main menu commands'
    },
    messages: {
      preferMenuHelper:
        'Use page.menu.openLocator() or page.menu.clickMenuItem() instead of raw Playwright selectors for JupyterLab main menu commands.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const menuLocatorAliases: Map<string, boolean>[] = [new Map()];
    const mainMenuTraversalScopes = [false];
    const contextMenuTraversalScopes = [false];
    let hasGalataImport = false;
    let hasPlainPlaywrightTestImport = false;

    function shouldCheckMenuHelpers(): boolean {
      return hasGalataImport || !hasPlainPlaywrightTestImport;
    }

    function isMenuLocatorAlias(name: string): boolean {
      for (let i = menuLocatorAliases.length - 1; i >= 0; i--) {
        const alias = menuLocatorAliases[i].get(name);
        if (alias !== undefined) {
          return alias;
        }
      }

      return false;
    }

    function setAlias(name: string, isMenuLocator: boolean): void {
      for (let i = menuLocatorAliases.length - 1; i >= 0; i--) {
        if (menuLocatorAliases[i].has(name)) {
          menuLocatorAliases[i].set(name, isMenuLocator);
          return;
        }
      }

      menuLocatorAliases[menuLocatorAliases.length - 1].set(
        name,
        isMenuLocator
      );
    }

    function declarePattern(
      node: TSESTree.Node | undefined,
      isMenuLocator: boolean
    ): void {
      if (!node) {
        return;
      }

      switch (node.type) {
        case 'Identifier':
          menuLocatorAliases[menuLocatorAliases.length - 1].set(
            node.name,
            isMenuLocator
          );
          break;
        case 'ArrayPattern':
          for (const element of node.elements) {
            declarePattern(element ?? undefined, isMenuLocator);
          }
          break;
        case 'ObjectPattern':
          for (const property of node.properties) {
            if (property.type === 'RestElement') {
              declarePattern(property.argument, isMenuLocator);
            } else {
              declarePattern(property.value, isMenuLocator);
            }
          }
          break;
        case 'AssignmentPattern':
          declarePattern(node.left, isMenuLocator);
          break;
        case 'RestElement':
          declarePattern(node.argument, isMenuLocator);
          break;
      }
    }

    function isMainMenuTraversalActive(): boolean {
      return mainMenuTraversalScopes[mainMenuTraversalScopes.length - 1];
    }

    function setMainMenuTraversalActive(active: boolean): void {
      mainMenuTraversalScopes[mainMenuTraversalScopes.length - 1] = active;
    }

    function isContextMenuTraversalActive(): boolean {
      return contextMenuTraversalScopes[contextMenuTraversalScopes.length - 1];
    }

    function setContextMenuTraversalActive(active: boolean): void {
      contextMenuTraversalScopes[contextMenuTraversalScopes.length - 1] =
        active;
    }

    function isRawMenuLocatorExpression(
      node: TSESTree.Expression | TSESTree.PrivateIdentifier
    ): boolean {
      if (node.type === 'Identifier') {
        return isMenuLocatorAlias(node.name);
      }

      if (node.type !== 'CallExpression') {
        return false;
      }

      if (isPageMemberCall(node, 'locator')) {
        return isMainMenuSelector(getStaticSelectorParts(node.arguments[0]));
      }

      if (isTopLevelMenuLocatorCall(node)) {
        return true;
      }

      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      const methodName = getPropertyName(callee);
      return (
        methodName !== null &&
        LOCATOR_CHAIN_METHODS.has(methodName) &&
        isRawMenuLocatorExpression(callee.object)
      );
    }

    function isTopLevelMainMenuLocatorExpression(
      node: TSESTree.Expression | TSESTree.PrivateIdentifier
    ): boolean {
      if (node.type !== 'CallExpression') {
        return false;
      }

      if (isPageMemberCall(node, 'locator')) {
        return isKnownTopLevelMainMenuSelector(
          getStaticSelectorParts(node.arguments[0]),
          true
        );
      }

      if (isTopLevelMenuLocatorCall(node)) {
        return true;
      }

      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      const methodName = getPropertyName(callee);
      return (
        methodName !== null &&
        OPEN_LOCATOR_CHAIN_METHODS.has(methodName) &&
        isTopLevelMainMenuLocatorExpression(callee.object)
      );
    }

    function isFollowUpSubmenuLocatorExpression(
      node: TSESTree.Expression | TSESTree.PrivateIdentifier
    ): boolean {
      if (node.type !== 'CallExpression') {
        return false;
      }

      if (isPageMemberCall(node, 'locator')) {
        return isFollowUpSubmenuSelector(
          getStaticSelectorParts(node.arguments[0])
        );
      }

      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      const methodName = getPropertyName(callee);
      return (
        methodName !== null &&
        OPEN_LOCATOR_CHAIN_METHODS.has(methodName) &&
        isFollowUpSubmenuLocatorExpression(callee.object)
      );
    }

    function isFollowUpMenuLocatorExpression(
      node: TSESTree.Expression | TSESTree.PrivateIdentifier
    ): boolean {
      if (node.type === 'Identifier') {
        return isMenuLocatorAlias(node.name);
      }

      if (node.type !== 'CallExpression') {
        return false;
      }

      if (isPageMemberCall(node, 'locator')) {
        const selectorParts = getStaticSelectorParts(node.arguments[0]);
        return (
          isFollowUpSubmenuSelector(selectorParts) ||
          isFollowUpMenuItemSelector(selectorParts)
        );
      }

      if (isMenuItemRoleCall(node)) {
        return true;
      }

      if (
        isPageMemberCall(node, 'getByText') &&
        getStaticString(node.arguments[0]) !== null
      ) {
        return true;
      }

      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      const methodName = getPropertyName(callee);
      return (
        methodName !== null &&
        LOCATOR_CHAIN_METHODS.has(methodName) &&
        isFollowUpMenuLocatorExpression(callee.object)
      );
    }

    function isMenuLocatorExpression(
      node: TSESTree.Expression | null | undefined
    ): boolean {
      return (
        !!node &&
        (isRawMenuLocatorExpression(node) ||
          (isMainMenuTraversalActive() &&
            isFollowUpMenuLocatorExpression(node)))
      );
    }

    function enterFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ): void {
      mainMenuTraversalScopes.push(false);
      contextMenuTraversalScopes.push(false);
      menuLocatorAliases.push(new Map());
      for (const param of node.params) {
        declarePattern(param, false);
      }
    }

    function exitFunction(): void {
      menuLocatorAliases.pop();
      mainMenuTraversalScopes.pop();
      contextMenuTraversalScopes.pop();
    }

    function isPageObjectMemberExpression(
      node: TSESTree.Node,
      objectName: string
    ): boolean {
      return (
        node.type === 'MemberExpression' &&
        node.object.type === 'MemberExpression' &&
        node.object.object.type === 'Identifier' &&
        node.object.object.name === 'page' &&
        getPropertyName(node.object) === objectName
      );
    }

    function closesOpenMenu(node: TSESTree.CallExpression): boolean {
      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      if (isPageObjectMemberExpression(callee, 'menu')) {
        return true;
      }

      if (isPageObjectMemberExpression(callee, 'keyboard')) {
        return (
          getPropertyName(callee) === 'press' &&
          getStaticString(node.arguments[0]) === 'Escape'
        );
      }

      return (
        callee.object.type === 'Identifier' &&
        callee.object.name === 'page' &&
        ['goto', 'reload'].includes(getPropertyName(callee) ?? '')
      );
    }

    function hasRightButtonOption(node: TSESTree.Node | undefined): boolean {
      const button = getObjectPropertyValue(node, 'button');
      return getStaticString(button ?? undefined) === 'right';
    }

    function opensContextMenu(node: TSESTree.CallExpression): boolean {
      const { callee } = node;
      if (callee.type !== 'MemberExpression') {
        return false;
      }

      const methodName = getPropertyName(callee);
      if (
        isPageObjectMemberExpression(callee, 'menu') &&
        ['openContextMenu', 'openContextMenuLocator'].includes(methodName ?? '')
      ) {
        return true;
      }

      if (methodName !== 'click') {
        return false;
      }

      if (isPageMemberCall(node, 'click')) {
        return hasRightButtonOption(node.arguments[1]);
      }

      if (isPageObjectMemberExpression(callee, 'mouse')) {
        return hasRightButtonOption(node.arguments[2]);
      }

      return hasRightButtonOption(node.arguments[0]);
    }

    return {
      Program(node) {
        for (const statement of node.body) {
          if (statement.type !== 'ImportDeclaration') {
            continue;
          }

          const source = getStaticString(statement.source);
          hasGalataImport ||= source === '@jupyterlab/galata';
          hasPlainPlaywrightTestImport ||= source === '@playwright/test';
        }
      },

      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      BlockStatement() {
        menuLocatorAliases.push(new Map());
      },
      'BlockStatement:exit'() {
        menuLocatorAliases.pop();
      },

      VariableDeclarator(node) {
        if (!shouldCheckMenuHelpers()) {
          return;
        }
        declarePattern(node.id, isMenuLocatorExpression(node.init));
      },

      AssignmentExpression(node) {
        if (!shouldCheckMenuHelpers()) {
          return;
        }
        if (node.left.type === 'Identifier') {
          setAlias(node.left.name, isMenuLocatorExpression(node.right));
        }
      },

      CallExpression(node) {
        if (!shouldCheckMenuHelpers()) {
          return;
        }

        const directSelectorParts =
          isPageMemberCall(node, 'click') || isPageMemberCall(node, 'hover')
            ? getStaticSelectorParts(node.arguments[0])
            : [];

        if (opensContextMenu(node)) {
          setMainMenuTraversalActive(false);
          setContextMenuTraversalActive(true);
          return;
        }

        if (
          isContextMenuTraversalActive() &&
          !isKnownTopLevelMainMenuSelector(directSelectorParts) &&
          (isLuminoMenuSelector(directSelectorParts) ||
            getTextSelectorLabel(directSelectorParts.join('')) !== null ||
            isFollowUpSubmenuSelector(directSelectorParts) ||
            isFollowUpMenuItemSelector(directSelectorParts))
        ) {
          setContextMenuTraversalActive(
            isPageMemberCall(node, 'hover') ||
              isContextSubmenuSelector(directSelectorParts)
          );
          return;
        }

        if (isMainMenuSelector(directSelectorParts)) {
          context.report({ node, messageId: 'preferMenuHelper' });
          setContextMenuTraversalActive(false);
          setMainMenuTraversalActive(
            isPageMemberCall(node, 'hover') ||
              isKnownTopLevelMainMenuSelector(directSelectorParts, true) ||
              (isMainMenuTraversalActive() &&
                isLuminoMenuSelector(directSelectorParts))
          );
          return;
        }

        if (
          (isPageMemberCall(node, 'click') || isPageMemberCall(node, 'hover')) &&
          isMainMenuTraversalActive() &&
          (getTextSelectorLabel(directSelectorParts.join('')) !== null ||
            isFollowUpSubmenuSelector(directSelectorParts) ||
            isFollowUpMenuItemSelector(directSelectorParts))
        ) {
          context.report({ node, messageId: 'preferMenuHelper' });
          setContextMenuTraversalActive(false);
          setMainMenuTraversalActive(
            isPageMemberCall(node, 'hover') ||
              isFollowUpSubmenuSelector(directSelectorParts)
          );
          return;
        }

        const { callee } = node;
        if (callee.type !== 'MemberExpression') {
          return;
        }

        const methodName = getPropertyName(callee);
        if (
          (methodName === 'click' || methodName === 'hover') &&
          isContextMenuTraversalActive() &&
          !isTopLevelMainMenuLocatorExpression(callee.object) &&
          (isFollowUpMenuLocatorExpression(callee.object) ||
            isRawMenuLocatorExpression(callee.object))
        ) {
          setContextMenuTraversalActive(
            methodName === 'hover' ||
              isContextSubmenuLocatorExpression(callee.object)
          );
          return;
        }

        if (
          (methodName === 'click' || methodName === 'hover') &&
          isRawMenuLocatorExpression(callee.object)
        ) {
          context.report({ node, messageId: 'preferMenuHelper' });
          setContextMenuTraversalActive(false);
          setMainMenuTraversalActive(
            methodName === 'hover' ||
              isTopLevelMainMenuLocatorExpression(callee.object) ||
              (isMainMenuTraversalActive() &&
                isLuminoMenuLocatorExpression(callee.object))
          );
          return;
        }

        if (
          (methodName === 'click' || methodName === 'hover') &&
          isMainMenuTraversalActive() &&
          isFollowUpMenuLocatorExpression(callee.object)
        ) {
          context.report({ node, messageId: 'preferMenuHelper' });
          setContextMenuTraversalActive(false);
          setMainMenuTraversalActive(
            methodName === 'hover' ||
              isFollowUpSubmenuLocatorExpression(callee.object)
          );
          return;
        }

        if (methodName === 'click' || methodName === 'hover') {
          setMainMenuTraversalActive(false);
          setContextMenuTraversalActive(false);
          return;
        }

        if (closesOpenMenu(node)) {
          setMainMenuTraversalActive(false);
          setContextMenuTraversalActive(false);
        }
      }
    };
  }
});

export = preferMenuHelper;
