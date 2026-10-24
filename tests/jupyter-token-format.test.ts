/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as path from 'path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import tokenFormat from '../src/rules/token-format';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

const typeAwareTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['tests/*.ts'],
        defaultProject: 'tsconfig.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

ruleTester.run('token-format', tokenFormat, {
  valid: [
    {
      // Standard format
      code: `new Token<IFoo>('@test/pkg:IFoo', 'A test service')`
    },
    {
      code: `new Token<void>('@test/pkg:IFoo')`
    },
    {
      // Package name with hyphens is fine — only the symbol after ':' is checked
      code: `new Token<void>('@test/my-pkg:IFoo')`
    },
    {
      // Underscore prefix in symbol
      code: `new Token<void>('@test/pkg:_IPrivate')`
    },
    {
      // new Token() with no arguments is skipped
      code: `new Token()`
    },
    {
      // Unresolved dynamic variable is skipped
      code: `new Token(myTokenId)`
    },
    {
      // Static template literal with valid symbol
      code: 'new Token<IFoo>(`@test/pkg:IFoo`)'
    },
    {
      // Template literal with variable package
      code: `
        const PKG = '@test/pkg';
        new Token<IFoo>(\`\${PKG}:IFoo\`);
      `
    },
    {
      // Constant string
      code: `
        const TOKEN_ID = '@test/pkg:IFoo';
        new Token<IFoo>(TOKEN_ID);
      `
    },
    {
      // Unrelated new expressions are not checked
      code: `new SomeOtherClass('@test/pkg:kebab-case', 'desc')`
    }
  ],

  invalid: [
    {
      // Kebab-case symbol
      code: `new Token<IFoo>('@test/pkg:foo-service', 'A test service')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:foo-service',
            symbol: 'foo-service'
          }
        }
      ]
    },
    {
      // No colon at all
      code: `new Token<void>('testpkgIFoo')`,
      errors: [
        {
          messageId: 'missingColon',
          data: { tokenId: 'testpkgIFoo' }
        }
      ]
    },
    {
      // Empty symbol after colon
      code: `new Token<void>('@test/pkg:')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: { tokenId: '@test/pkg:', symbol: '' }
        }
      ]
    },
    {
      // Symbol with a dot
      code: `new Token<void>('@test/pkg:IFoo.IBar')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: { tokenId: '@test/pkg:IFoo.IBar', symbol: 'IFoo.IBar' }
        }
      ]
    },
    {
      // Template literal with invalid symbol
      code: 'new Token<IFoo>(`@test/pkg:kebab-case`)',
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:kebab-case',
            symbol: 'kebab-case'
          }
        }
      ]
    },
    {
      // Template literal with variable package and invalid symbol
      code: `
        const PKG = '@test/pkg';
        new Token<IFoo>(\`\${PKG}:kebab-case\`);
      `,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:kebab-case',
            symbol: 'kebab-case'
          }
        }
      ]
    },
    {
      // Constant string with invalid symbol
      code: `
        const TOKEN_ID = '@test/pkg:kebab-case';
        new Token<IFoo>(TOKEN_ID);
      `,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:kebab-case',
            symbol: 'kebab-case'
          }
        }
      ]
    }
  ]
});

typeAwareTester.run('token-format (type-aware)', tokenFormat, {
  valid: [
    {
      code: `
        declare const id: '@test/pkg:IFoo';
        new Token<IFoo>(id);
      `,
      filename: 'tests/type-aware-fixture.ts'
    }
  ],
  invalid: [
    {
      code: `
        declare const id: '@test/pkg:kebab-case';
        new Token<IFoo>(id);
      `,
      filename: 'tests/type-aware-fixture.ts',
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:kebab-case',
            symbol: 'kebab-case'
          }
        }
      ]
    }
  ]
});
