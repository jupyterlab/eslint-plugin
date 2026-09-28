/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import {
  getPluginId,
  isPluginArrayType,
  isPluginDescriptorType
} from '../utils/plugin-utils';

type DescriptionStatus = 'missing' | 'empty' | 'present';

/**
 * Returns whether the object expression has a description property and whether
 * it is non-empty.
 *
 * - 'missing'  – no description key found
 * - 'empty'    – key exists but its literal value is empty / whitespace-only
 * - 'present'  – key exists with a non-empty value (or a non-literal value)
 */
function checkDescriptionProperty(
  obj: TSESTree.ObjectExpression
): DescriptionStatus {
  for (const prop of obj.properties) {
    if (prop.type === 'Property') {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName === 'description') {
        if (prop.value.type === 'Literal') {
          const value = prop.value.value;
          return typeof value === 'string' && value.trim().length > 0
            ? 'present'
            : 'empty';
        }
        return 'present';
      }
    }
  }
  return 'missing';
}

function unwrapTypeCast(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSTypeAssertion'
  ) {
    current = current.expression;
  }
  return current;
}

const jupyterPluginDescription = createRule({
  name: 'plugin-description',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all JupyterLab plugins have a description property',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/plugin-description/'
    },
    messages: {
      missingDescription:
        'JupyterLab plugin{{ pluginId }} is missing a "description" property.',
      emptyDescription:
        'JupyterLab plugin{{ pluginId }} has an empty "description" property.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    let services: ParserServices | null = null;
    let checker: ts.TypeChecker | null = null;

    try {
      services = ESLintUtils.getParserServices(context, true);
      checker = services.program ? services.program.getTypeChecker() : null;
    } catch {
      services = null;
    }

    const getTSNode = services
      ? (node: TSESTree.Node) => services?.esTreeNodeToTSNodeMap.get(node)
      : null;

    function checkPluginObject(pluginObj: TSESTree.ObjectExpression): void {
      const pluginId = getPluginId(
        pluginObj,
        context.sourceCode.getScope(pluginObj),
        checker,
        getTSNode
      );
      const pluginIdSuffix = pluginId ? ` "${pluginId}"` : '';

      const descriptionStatus = checkDescriptionProperty(pluginObj);
      if (descriptionStatus !== 'present') {
        context.report({
          node: pluginObj,
          messageId:
            descriptionStatus === 'empty'
              ? 'emptyDescription'
              : 'missingDescription',
          data: { pluginId: pluginIdSuffix }
        });
      }
    }

    function checkContainer(
      containerNode: TSESTree.Node,
      typeNode: TSESTree.TypeNode | null | undefined
    ): void {
      if (isPluginDescriptorType(typeNode, checker, getTSNode)) {
        const unwrapped = unwrapTypeCast(containerNode);
        if (unwrapped.type === 'ObjectExpression') {
          checkPluginObject(unwrapped);
        }
      } else if (isPluginArrayType(typeNode, checker, getTSNode)) {
        const unwrapped = unwrapTypeCast(containerNode);
        if (unwrapped.type === 'ArrayExpression') {
          for (const element of unwrapped.elements) {
            if (!element) {
              continue;
            }
            const unwrappedElement = unwrapTypeCast(element);
            if (unwrappedElement.type === 'ObjectExpression') {
              checkPluginObject(unwrappedElement);
            }
          }
        }
      }
    }

    return {
      VariableDeclarator(varDecl) {
        if (!varDecl.init) {
          return;
        }

        const typeAnnotation =
          varDecl.id.type === 'Identifier'
            ? varDecl.id.typeAnnotation?.typeAnnotation
            : null;

        let initCastAnnotation: TSESTree.TypeNode | null = null;
        if (
          varDecl.init.type === 'TSAsExpression' ||
          varDecl.init.type === 'TSSatisfiesExpression' ||
          varDecl.init.type === 'TSTypeAssertion'
        ) {
          initCastAnnotation = varDecl.init.typeAnnotation;
        }

        const effectiveType =
          isPluginDescriptorType(typeAnnotation, checker, getTSNode) ||
          isPluginArrayType(typeAnnotation, checker, getTSNode)
            ? typeAnnotation
            : initCastAnnotation;

        checkContainer(varDecl.init, effectiveType);
      },

      ExportDefaultDeclaration(node) {
        let castAnnotation: TSESTree.TypeNode | null = null;
        if (
          node.declaration.type === 'TSAsExpression' ||
          node.declaration.type === 'TSSatisfiesExpression' ||
          node.declaration.type === 'TSTypeAssertion'
        ) {
          castAnnotation = node.declaration.typeAnnotation;
        }

        checkContainer(node.declaration, castAnnotation);
      }
    };
  }
});

export = jupyterPluginDescription;
