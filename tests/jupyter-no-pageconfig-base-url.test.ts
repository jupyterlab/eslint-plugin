/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noPageconfigBaseUrl from '../src/rules/no-pageconfig-base-url';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('no-pageconfig-base-url', noPageconfigBaseUrl, {
  valid: [
    // Different method on PageConfig
    { code: `PageConfig.getOption('someKey');` },
    // Different object
    { code: `someOther.getBaseUrl();` },
    // Free function call
    { code: `getBaseUrl();` },
    // Property access (not a call)
    { code: `const url = settings.baseUrl;` }
  ],

  invalid: [
    {
      code: `const url = PageConfig.getBaseUrl();`,
      errors: [{ messageId: 'noPageconfigBaseUrl' }]
    },
    {
      code: `PageConfig.getBaseUrl();`,
      errors: [{ messageId: 'noPageconfigBaseUrl' }]
    },
    {
      code: `const x = URLExt.join(PageConfig.getBaseUrl(), path);`,
      errors: [{ messageId: 'noPageconfigBaseUrl' }]
    },
    {
      code: `this._baseUrl = PageConfig.getBaseUrl();`,
      errors: [{ messageId: 'noPageconfigBaseUrl' }]
    }
  ]
});
