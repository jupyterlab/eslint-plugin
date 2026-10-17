/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { getObjectProperties } from '../utils/plugin-utils';
import {
  isAddCommandCall,
  isPrivateCommandRegistry,
  resolveCommandId
} from '../utils/commands';
import { getTypeServices } from '../utils/type-services';
import { createRule } from '../utils/create-rule';

const jupyterCommandDescribedBy = createRule({
  name: 'command-described-by',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure JupyterLab commands include describedBy property',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/command-described-by/'
    },
    messages: {
      missingDescribedBy:
        'Command "{{ commandId }}" is missing the "describedBy" property.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    const { checker, getTSNode } = getTypeServices(context);

    return {
      CallExpression(node) {
        // Check if this is <something>.addCommand()
        if (!isAddCommandCall(node) || node.arguments.length < 2) {
          return;
        }

        const commandIdArg = node.arguments[0];
        const optionsArg = node.arguments[1];

        if (commandIdArg.type === 'SpreadElement') {
          return;
        }

        // A registry created on the spot, such as one backing a context
        // menu, is never listed or queried alongside the application's.
        const callee = node.callee as TSESTree.MemberExpression;
        if (
          callee.object.type !== 'Super' &&
          isPrivateCommandRegistry(
            callee.object,
            context.sourceCode.getScope(node)
          )
        ) {
          return;
        }

        // Extract command ID for error message
        const resolvedId = resolveCommandId(
          commandIdArg,
          context.sourceCode,
          checker,
          getTSNode
        );
        let commandId = resolvedId ?? 'unknown';
        if (resolvedId === null) {
          if (
            commandIdArg.type === 'Literal' &&
            typeof commandIdArg.value === 'string'
          ) {
            commandId = commandIdArg.value;
          } else if (commandIdArg.type === 'Identifier') {
            commandId = commandIdArg.name;
          } else if (
            commandIdArg.type === 'MemberExpression' &&
            commandIdArg.property.type === 'Identifier'
          ) {
            commandId = commandIdArg.property.name;
          }
        }

        // Options must be an object
        if (optionsArg.type !== 'ObjectExpression') {
          return;
        }

        const properties = getObjectProperties(optionsArg);

        // Check if execute function exists and has parameters
        const executeProp = properties.get('execute');
        if (!executeProp || executeProp.value.type === 'Literal') {
          return;
        }

        const describedByProp = properties.get('describedBy');

        if (!describedByProp) {
          context.report({
            node,
            messageId: 'missingDescribedBy',
            data: { commandId }
          });
          return;
        }

        if (describedByProp.value.type !== 'ObjectExpression') {
          return;
        }
      }
    };
  }
});

export = jupyterCommandDescribedBy;
