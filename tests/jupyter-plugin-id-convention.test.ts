/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import pluginIdConvention from '../src/rules/plugin-id-convention';

const fixtureFilename = path.join(
  __dirname,
  'fixtures',
  'extension-pkg',
  'src',
  'index.ts'
);

const nonExtensionFilename = path.join(__dirname, 'fixtures', 'lazy-plugin.ts');

const corePackageFilename = path.join(
  __dirname,
  'fixtures',
  'core-pkg',
  'src',
  'index.ts'
);

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('plugin-id-convention', pluginIdConvention, {
  valid: [
    {
      filename: fixtureFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: '@jupyterlab/example-extension:plugin',
          description: 'Example plugin',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: fixtureFilename,
      code: `
        const PLUGIN_ID = '@jupyterlab/example-extension:main';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: PLUGIN_ID,
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: fixtureFilename,
      code: `
        export default {
          id: '@jupyterlab/example-extension:default',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: fixtureFilename,
      code: `
        const plugins: JupyterFrontEndPlugin<any>[] = [
          {
            id: '@jupyterlab/example-extension:first',
            activate: () => {}
          },
          {
            id: '@jupyterlab/example-extension:second',
            activate: () => {}
          }
        ];
      `
    },
    {
      filename: nonExtensionFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'other-extension:plugin',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: corePackageFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: '@jupyterlab/example-extension:plugin',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: fixtureFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: getPluginId(),
          autoStart: true,
          activate: () => {}
        };
      `
    }
  ],

  invalid: [
    {
      filename: fixtureFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: '@jupyterlab/other-extension:plugin',
          autoStart: true,
          activate: () => {}
        };
      `,
      errors: [
        {
          messageId: 'mismatchedPrefix',
          data: {
            pluginId: '@jupyterlab/other-extension:plugin',
            packageName: '@jupyterlab/example-extension'
          }
        }
      ]
    },
    {
      filename: fixtureFilename,
      code: `
        const plugin = {
          id: 'example-extension:plugin',
          autoStart: true,
          activate: () => {}
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: fixtureFilename,
      code: `
        const PLUGIN_ID = '@jupyterlab/other-extension:plugin';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: PLUGIN_ID,
          autoStart: true,
          activate: () => {}
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: fixtureFilename,
      code: `
        const plugins = [
          {
            id: '@jupyterlab/other-extension:first',
            activate: () => {}
          }
        ] satisfies JupyterFrontEndPlugin<any>[];
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: fixtureFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: '@jupyterlab/example-extension',
          autoStart: true,
          activate: () => {}
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    }
  ]
});
