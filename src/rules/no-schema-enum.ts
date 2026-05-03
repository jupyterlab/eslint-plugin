/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';

function isSchemaJsonFile(filename: string): boolean {
  return /[/\\]schema[/\\][^/\\]*\.json$/.test(filename);
}

const noSchemaEnum = createRule({
  name: 'no-schema-enum',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `enum` in settings JSON schema files; use `oneOf` with `const` and `title` instead'
    },
    messages: {
      forbidEnum:
        'Avoid `enum` in settings schema. Use `oneOf` with `const` and `title` per entry to support user-facing labels and translations.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    const filename: string =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context.filename ?? (context as any).getFilename?.() ?? '';

    if (!isSchemaJsonFile(filename)) {
      return {};
    }

    return {
      // Visitor for jsonc-eslint-parser JSON AST nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JSONProperty(node: any) {
        const keyValue: unknown =
          node.key.type === 'JSONLiteral' ? node.key.value : node.key.name;

        if (keyValue === 'enum' && node.value.type === 'JSONArrayExpression') {
          context.report({
            node,
            messageId: 'forbidEnum'
          });
        }
      }
    };
  }
});

export = noSchemaEnum;
