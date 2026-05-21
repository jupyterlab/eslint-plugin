/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';

const jupyterNoPageconfigBaseUrl = createRule({
  name: 'no-pageconfig-base-url',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow PageConfig.getBaseUrl() outside of makeSettings()',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-pageconfig-base-url/'
    },
    messages: {
      noPageconfigBaseUrl:
        'PageConfig.getBaseUrl() should not be called outside of makeSettings(). ' +
        'Store ServerConnection.ISettings and access .baseUrl from it each time.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'PageConfig' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'getBaseUrl'
        ) {
          context.report({ node, messageId: 'noPageconfigBaseUrl' });
        }
      }
    };
  }
});

export = jupyterNoPageconfigBaseUrl;
