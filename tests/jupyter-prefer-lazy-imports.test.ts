/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import preferLazyImports from '../src/rules/prefer-lazy-imports';
import { DEFAULT_ALLOWED_PACKAGES } from '../src/utils/lazy-imports';

// Relative imports in these cases resolve against `tests/fixtures`, so the
// rule can measure how much code they hold.
const fixtureFilename = 'tests/fixtures/lazy-plugin.ts';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

const tsxTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

ruleTester.run('prefer-lazy-imports', preferLazyImports, {
  valid: [
    // Not a plugin module: the rule does not apply.
    {
      code: `
        import { HeavyWidget } from './widget';
        export function makeWidget() {
          return new HeavyWidget();
        }
      `
    },
    // Allowlisted packages are already in the shared runtime.
    {
      code: `
        import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { Dialog } from '@jupyterlab/apputils';
        import { Widget } from '@lumino/widgets';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: (app: JupyterFrontEnd) => {
            new Dialog({ body: new Widget() });
          }
        };
        export default plugin;
      `
    },
    // Import used at module level, so the module loads eagerly regardless.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { IMyToken } from './tokens';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          requires: [IMyToken],
          activate: (app, token) => {
            console.log(token);
          }
        };
        export default plugin;
      `
    },
    // Aggregator index: plugin objects are referenced at module level.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import first from './first';
        import second from './second';
        const plugins: JupyterFrontEndPlugin<any>[] = [first, second];
        export default plugins;
      `
    },
    // Type-only imports are erased by TypeScript.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import type { HeavyWidget } from './widget';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {
            const widget: HeavyWidget | null = null;
            return widget;
          }
        };
      `
    },
    // A specifier marked type-only inside a value import is also erased.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { type HeavyWidget } from './widget';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {
            const widget: HeavyWidget | null = null;
            return widget;
          }
        };
      `
    },
    // Side-effect imports have no binding to move.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import '../style/index.css';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {}
        };
      `
    },
    // Already deferred.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: async () => {
            const { HeavyWidget } = await import('./widget');
            return new HeavyWidget();
          }
        };
      `
    },
    // Explicitly ignored specifier.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { CommandIDs } from './commands';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {
            console.log(CommandIDs.open);
          }
        };
      `,
      options: [
        {
          allowedPackages: ['@jupyterlab/*'],
          ignoreImports: ['./commands'],
          reportModuleLevelUsage: false
        }
      ]
    },
    // A reference inside an immediately invoked callback runs at load time,
    // so there is nothing to defer.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { transform } from 'some-lib';
        const values = [1, 2, 3].map(value => transform(value));
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {
            console.log(values);
          }
        };
      `
    },
    // A static class field runs when the class is defined, not on construction.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { registry } from 'some-lib';
        class Holder {
          static shared = registry.create();
        }
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new Holder()
        };
      `
    },
    // Module level use is allowed unless the strict option is enabled.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { compute } from 'some-lib';
        const value = compute();
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => value
        };
      `
    },
    // A token referenced in `optional` cannot be deferred, even when the
    // plugin object is built inside a factory function.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { ILayoutRestorer } from './layoutrestorer';
        export function createPlugins(): JupyterFrontEndPlugin<void>[] {
          return [
            {
              id: 'test:plugin',
              optional: [ILayoutRestorer],
              activate: (app, restorer) => restorer
            }
          ];
        }
      `
    },
    // One source imported twice: the eager declaration keeps the module in the
    // startup bundle, so the other one has nothing to gain.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { CpuView } from './cpuView';
        import { DEFAULT_CPU_LABEL } from './cpuView';
        const label = DEFAULT_CPU_LABEL;
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => CpuView.create(label)
        };
      `
    },
    // The helper holding the only reference is itself called at module level.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { buildTable } from './table';
        function makeTable() {
          return buildTable();
        }
        const table = makeTable();
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => table
        };
      `
    },
    // The same through two levels of helper.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { buildTable } from './table';
        const inner = () => buildTable();
        function outer() {
          return inner();
        }
        const table = outer();
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => table
        };
      `
    },
    // A value re-export keeps the source in the startup bundle anyway.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { NotebookDiff } from './diff';
        export { NotebookDiff } from './diff';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new NotebookDiff()
        };
      `
    },
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { NotebookDiff } from './diff';
        export * from './diff';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new NotebookDiff()
        };
      `
    },
    // An image or a font becomes a URL once past the bundler's inline limit,
    // so the browser already fetches the large ones on demand. A stylesheet is
    // applied when imported, so deferring it would change behaviour.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import logo from '../style/logo.png';
        import font from '../style/inter.woff2';
        import styles from '../style/index.css';
        import wasmUrl from 'rtree-sql.js/dist/sql-wasm.wasm';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => [logo, font, styles, wasmUrl]
        };
      `
    },
    // A small icon is inlined into the bundle, but not enough of it to matter.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import icon from './lazy-icon.svg';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => icon
        };
      `
    },
    // A module of identifiers is too small for a separate chunk to pay off.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { CommandIDs } from './lazy-tiny';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => CommandIDs.open
        };
      `
    },
    // Large as source, but nearly everything in it is erased by TypeScript.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { MODE_ID } from './lazy-type-heavy';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => MODE_ID
        };
      `
    },
    // Tokens in requires stay eager even under the strict option.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { IMyToken } from './tokens';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          requires: [IMyToken],
          provides: [IMyToken],
          activate: (app, token) => token
        };
      `,
      options: [
        {
          allowedPackages: ['@jupyterlab/*'],
          ignoreImports: [],
          reportModuleLevelUsage: true
        }
      ]
    }
  ],

  invalid: [
    // The core case: a relative import used only inside activate.
    {
      code: `
        import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { HeavyWidget } from './widget';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: (app: JupyterFrontEnd) => {
            app.shell.add(new HeavyWidget(), 'main');
          }
        };
        export default plugin;
      `,
      errors: [
        {
          messageId: 'preferLazyImport',
          data: {
            source: './widget',
            snippet: "const { HeavyWidget } = await import('./widget');"
          }
        }
      ]
    },
    // A non-allowlisted package used only inside a command callback.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import * as vega from 'vega-embed';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: app => {
            app.commands.addCommand('render', {
              execute: () => vega.default('#el', {})
            });
          }
        };
      `,
      errors: [
        {
          messageId: 'preferLazyImport',
          data: {
            source: 'vega-embed',
            snippet: "const vega = await import('vega-embed');"
          }
        }
      ]
    },
    // `@lumino/datagrid` is denied even though `@lumino/*` is allowed.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { DataGrid } from '@lumino/datagrid';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new DataGrid()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A default import, reported with the matching snippet.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import Editor from './editor';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new Editor()
        };
      `,
      errors: [
        {
          messageId: 'preferLazyImport',
          data: {
            source: './editor',
            snippet: "const { default: Editor } = await import('./editor');"
          }
        }
      ]
    },
    // A renamed specifier keeps its alias in the snippet.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { HeavyWidget as Heavy } from './widget';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new Heavy()
        };
      `,
      errors: [
        {
          messageId: 'preferLazyImport',
          data: {
            source: './widget',
            snippet: "const { HeavyWidget: Heavy } = await import('./widget');"
          }
        }
      ]
    },
    // A plugin written without a type annotation is still a plugin module.
    {
      code: `
        import { HeavyWidget } from './widget';
        export default {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new HeavyWidget()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // `satisfies` and `as` annotations are recognised.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { HeavyWidget } from './widget';
        export default {
          id: 'test:plugin',
          activate: () => new HeavyWidget()
        } as JupyterFrontEndPlugin<void>;
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A factory function returning a plugin marks the module too.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { HeavyWidget } from './widget';
        export function createPlugin(): JupyterFrontEndPlugin<void> {
          return {
            id: 'test:plugin',
            activate: () => new HeavyWidget()
          };
        }
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // Use inside a class method is deferred, so the import can move.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { parse } from 'heavy-parser';
        class Renderer {
          render(source: string) {
            return parse(source);
          }
        }
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new Renderer()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A module level dynamic import defers nothing.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        const heavy = import('./widget');
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: async () => (await heavy).HeavyWidget
        };
      `,
      errors: [{ messageId: 'topLevelDynamicImport' }]
    },
    // The strict option reports module level use.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { compute } from 'some-lib';
        const value = compute();
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => value
        };
      `,
      options: [
        {
          allowedPackages: ['@jupyterlab/*'],
          ignoreImports: [],
          reportModuleLevelUsage: true
        }
      ],
      errors: [
        {
          messageId: 'eagerModuleLevelUse',
          data: { source: 'some-lib', quotedSource: "'some-lib'" }
        }
      ]
    },
    // Under the strict option an aggregator index is reported as well.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import first from './first';
        const plugins: JupyterFrontEndPlugin<any>[] = [first];
        export default plugins;
      `,
      options: [
        {
          allowedPackages: ['@jupyterlab/*'],
          ignoreImports: [],
          reportModuleLevelUsage: true
        }
      ],
      errors: [{ messageId: 'eagerModuleLevelUse' }]
    },
    // A custom allowlist replaces the default one.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { Widget } from '@lumino/widgets';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new Widget()
        };
      `,
      options: [
        {
          allowedPackages: ['@jupyterlab/*'],
          ignoreImports: [],
          reportModuleLevelUsage: false
        }
      ],
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A type-only re-export is erased, so the import can still be deferred.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { NotebookDiff } from './diff';
        export type { INotebookDiff } from './diff';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new NotebookDiff()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A helper called only from another function stays deferred.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { buildTable } from './table';
        function makeTable() {
          return buildTable();
        }
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => makeTable()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // One source imported twice with only deferred uses is reported once, with
    // the bindings of both declarations merged into the snippet.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { CpuView } from './cpuView';
        import { DEFAULT_CPU_LABEL } from './cpuView';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => CpuView.create(DEFAULT_CPU_LABEL)
        };
      `,
      errors: [
        {
          messageId: 'preferLazyImport',
          data: {
            source: './cpuView',
            snippet:
              "const { CpuView, DEFAULT_CPU_LABEL } = await import('./cpuView');"
          }
        }
      ]
    },
    // A module with enough code in it is reported.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { HeavyTable } from './lazy-large';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => new HeavyTable({ rows: 2, columns: 2 })
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A small module counts the code of what it imports, so this one is over
    // the threshold even though its own file is tiny.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { createTable } from './lazy-barrel';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => createTable()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // Setting the threshold to zero reports every module regardless of size.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { CommandIDs } from './lazy-tiny';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => CommandIDs.open
        };
      `,
      options: [
        {
          allowedPackages: DEFAULT_ALLOWED_PACKAGES,
          ignoreImports: [],
          minimumSize: 0,
          reportModuleLevelUsage: false
        }
      ],
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // An SVG imported from JavaScript is inlined into the bundle as text, so a
    // large one belongs in a deferred chunk like any other module.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import diagram from './lazy-diagram.svg';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => diagram
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A raw stylesheet is inlined as text rather than applied as a style.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import theme from './lazy-theme.raw.css';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => theme
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // A package which is not in the shared runtime is bundled into the
    // extension, so it is reported without being measured.
    {
      filename: fixtureFilename,
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { parse } from 'heavy-parser';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => parse('')
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    },
    // Subpath imports resolve to their owning package for allowlist checks.
    {
      code: `
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { render } from 'heavy-lib/lib/render';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => render()
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    }
  ]
});

tsxTester.run('prefer-lazy-imports (tsx)', preferLazyImports, {
  valid: [
    // React is loaded eagerly by the application.
    {
      code: `
        import * as React from 'react';
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { ReactWidget } from '@jupyterlab/ui-components';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => ReactWidget.create(<div />)
        };
      `
    }
  ],
  invalid: [
    // A JSX reference inside a function body is a deferred value reference.
    {
      code: `
        import * as React from 'react';
        import { JupyterFrontEndPlugin } from '@jupyterlab/application';
        import { Chart } from 'heavy-charts';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test:plugin',
          autoStart: true,
          activate: () => {
            const render = () => <Chart />;
            return render;
          }
        };
      `,
      errors: [{ messageId: 'preferLazyImport' }]
    }
  ]
});
