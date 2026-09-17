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

const nestedCorePackageFilename = path.join(
  __dirname,
  'fixtures',
  'extension-pkg',
  'core-nested',
  'src',
  'index.ts'
);

const disabledExtensionFilename = path.join(
  __dirname,
  'fixtures',
  'disabled-extension-pkg',
  'src',
  'index.ts'
);

const mimePackageFilename = path.join(
  __dirname,
  'fixtures',
  'mime-pkg',
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

// Resolving a renamed namespace import needs the TypeScript program.
const typeAwareTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['tests/fixtures/mime-pkg/src/*.ts'],
        defaultProject: 'tsconfig.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
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
        const PLUGIN_ID = '@jupyterlab/example-extension:main';
        const plugin = {
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
      filename: nestedCorePackageFilename,
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: '@jupyterlab/core-nested:plugin',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    {
      filename: disabledExtensionFilename,
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
    },
    // MIME renderer entries are registered as plugins under their `id`.
    {
      filename: mimePackageFilename,
      code: `
        const extension: IRenderMime.IExtension = {
          id: '@jupyterlab/example-mime:factory',
          rendererFactory
        };
        export default extension;
      `
    },
    {
      filename: mimePackageFilename,
      code: `
        export default [
          {
            id: '@jupyterlab/example-mime:factory',
            rendererFactory,
            rank: 0
          }
        ];
      `
    },
    {
      filename: nonExtensionFilename,
      code: `
        const extension: IRenderMime.IExtension = {
          id: 'other-extension:factory',
          rendererFactory
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
        const PLUGIN_ID = '@jupyterlab/other-extension:plugin';
        const plugin = {
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
        const plugin = {
          id: '',
          autoStart: true,
          activate: () => {}
        };
      `,
      errors: [
        {
          messageId: 'mismatchedPrefix',
          data: {
            pluginId: '',
            packageName: '@jupyterlab/example-extension'
          }
        }
      ]
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
    },
    {
      filename: fixtureFilename,
      code: `
        function make(): JupyterFrontEndPlugin<void> {
          return {
            id: '@jupyterlab/other-extension:factory',
            activate: () => {}
          };
        }
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    // A MIME renderer entry in a package which only declares `mimeExtension`.
    {
      filename: mimePackageFilename,
      code: `
        const extension: IRenderMime.IExtension = {
          id: '@jupyterlab/other-mime:factory',
          rendererFactory
        };
      `,
      errors: [
        {
          messageId: 'mismatchedPrefix',
          data: {
            pluginId: '@jupyterlab/other-mime:factory',
            packageName: '@jupyterlab/example-mime'
          }
        }
      ]
    },
    // The union JupyterLab's own MIME packages use for the default export.
    {
      filename: fixtureFilename,
      code: `
        const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
          {
            id: '@jupyterlab/example-extension:factory',
            rendererFactory
          },
          {
            id: '@jupyterlab/example-lines-extension:factory',
            rendererFactory
          }
        ];
        export default extensions;
      `,
      errors: [
        {
          messageId: 'mismatchedPrefix',
          data: {
            pluginId: '@jupyterlab/example-lines-extension:factory',
            packageName: '@jupyterlab/example-extension'
          }
        }
      ]
    },
    // Without a type annotation the entry is recognised by `rendererFactory`.
    {
      filename: mimePackageFilename,
      code: `
        export default [
          {
            id: '@jupyterlab/other-mime:factory',
            rendererFactory,
            rank: 0
          }
        ];
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: mimePackageFilename,
      code: `
        const EXTENSION_ID = '@jupyterlab/other-mime:factory';
        const extension: IRenderMime.IExtension = {
          id: EXTENSION_ID,
          rendererFactory
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    // The properties come from a spread, so only the annotation identifies
    // the object as a MIME entry.
    {
      filename: mimePackageFilename,
      code: `
        const extension: IRenderMime.IExtension = {
          id: '@jupyterlab/other-mime:factory',
          ...shared
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: mimePackageFilename,
      code: `
        function make(): IRenderMime.IExtension {
          return {
            id: '@jupyterlab/other-mime:factory',
            ...shared
          };
        }
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    },
    {
      filename: mimePackageFilename,
      code: `
        import * as Interfaces from '@jupyterlab/rendermime-interfaces';
        const extension: Interfaces.IRenderMime.IExtension = {
          id: '@jupyterlab/other-mime:factory',
          ...shared
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    }
  ]
});

typeAwareTester.run('plugin-id-convention (type-aware)', pluginIdConvention, {
  valid: [],
  invalid: [
    // The MIME entry type is reached through a renamed namespace import, so
    // only the checker can tell that this object is a MIME renderer entry.
    {
      filename: 'tests/fixtures/mime-pkg/src/type-aware-fixture.ts',
      code: `
        import { IRenderMime as RM } from '../../types';
        const shared = { rendererFactory: {} };
        const extension: RM.IExtension = {
          id: '@jupyterlab/other-mime:factory',
          ...shared
        };
      `,
      errors: [{ messageId: 'mismatchedPrefix' }]
    }
  ]
});
