/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';

const TRANS_METHOD = '__';

/**
 * Returns true if the node is a recognized JupyterLab translation bundle:
 * trans | this.trans | this._trans | props.trans | this.props.trans
 * Refer jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules
 */
function isTransBundle(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'trans';
  }

  if (node.type === 'MemberExpression' && !node.computed) {
    const prop = node.property;
    if (prop.type !== 'Identifier') {
      return false;
    }

    // this.trans / this._trans
    if (node.object.type === 'ThisExpression') {
      return prop.name === 'trans' || prop.name === '_trans';
    }

    // props.trans
    if (
      prop.name === 'trans' &&
      node.object.type === 'Identifier' &&
      node.object.name === 'props'
    ) {
      return true;
    }

    // this.props.trans
    if (
      prop.name === 'trans' &&
      node.object.type === 'MemberExpression' &&
      !node.object.computed &&
      node.object.object.type === 'ThisExpression' &&
      node.object.property.type === 'Identifier' &&
      node.object.property.name === 'props'
    ) {
      return true;
    }
  }

  return false;
}

const noTranslationConcatenation = createRule({
  name: 'no-translation-concatenation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid string concatenation inside translation wrapper calls',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-translation-concatenation/'
    },
    messages: {
      noConcatenation:
        'Do not use string concatenation inside translation wrappers. Use a placeholder instead, e.g. trans.__("Hello %1", name).'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') {
          return;
        }
        const callee = node.callee;
        if (callee.computed || callee.property.type !== 'Identifier') {
          return;
        }
        if (callee.property.name !== TRANS_METHOD) {
          return;
        }
        if (!isTransBundle(callee.object)) {
          return;
        }

        for (const arg of node.arguments) {
          if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            context.report({ node: arg, messageId: 'noConcatenation' });
          }
        }
      }
    };
  }
});

export = noTranslationConcatenation;
