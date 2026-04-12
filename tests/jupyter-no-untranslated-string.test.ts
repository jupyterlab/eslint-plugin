/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noUntranslatedString from '../src/rules/no-untranslated-string';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('no-untranslated-string', noUntranslatedString, {
  valid: [
    {
      code: `
        commands.addCommand('file-download', {
          label: trans.__('Download'),
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: () => trans.__('Download'),
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: trans.__('Save'),
          caption: trans.__('Save notebook'),
          description: trans.__('Save the current notebook'),
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: someVar,
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: '',
          execute: () => {}
        });
      `
    },
    
    // setAttribute: translated values are OK
    {
      code: `el.setAttribute('aria-label', trans.__('main sidebar'));`
    },
    {
      code: `el.setAttribute('title', trans.__('Close Tab'));`
    },
    {
      code: `el.setAttribute('data-custom', 'some-value');`
    },
    {
      code: `el.setAttribute('class', 'jp-widget');`
    },
    {
      code: `el.setAttribute('aria-label', labelVar);`
    },
    {
      code: `el.setAttribute('title', '');`
    },
    // property assignment: translated values are OK
    {
      code: `el.title = trans.__('Close Tab');`
    },
    {
      code: `el.ariaLabel = trans.__('Search results');`
    },
    {
      code: `el.id = 'my-element';`
    },
    // Variable is OK
    {
      code: `el.title = titleVar;`
    },
    {
      code: `el['title'] = 'Close Tab';`
    },
    {
      code: `el.title += 'Close Tab';`
    }
  ],

  invalid: [
    {
      code: `
        commands.addCommand('file-download', {
          label: 'Download',
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
    {
      code: `
        commands.addCommand('file-save', {
          caption: 'Save file',
          execute: () => {}
        });
      `,
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'caption' } }
      ]
    },
    {
      code: `
        commands.addCommand('filebrowser:open', {
          description: 'Opens the file browser',
          execute: () => {}
        });
      `,
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'description' } }
      ]
    },
    {
      code: `
        commands.addCommand(CommandIDs.close, {
          label: () => 'Close Tab',
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: \`Download\`,
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
   
    // setAttribute: raw string with aria-label
    {
      code: `el.setAttribute('aria-label', 'main sidebar');`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'aria-label' } }
      ]
    },
    {
      code: `el.setAttribute('title', 'Close Tab');`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'title' } }
      ]
    },
    // setAttribute: raw string with aria-descriptin
    {
      code: `el.setAttribute('aria-description', 'Describes the widget');`,
      errors: [
        {
          messageId: 'untranslatedSetAttribute',
          data: { attr: 'aria-description' }
        }
      ]
    },
    // setAttribute: template literal with no expressions
    {
      code: `el.setAttribute('aria-label', \`main sidebar\`);`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'aria-label' } }
      ]
    },
    // Property assignment: raw string to title
    {
      code: `el.title = 'Close Tab';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'title' } }
      ]
    },
    // Property assignment: raw string to ariaLabel
    {
      code: `el.ariaLabel = 'Search results';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'ariaLabel' } }
      ]
    }
  ]
});
