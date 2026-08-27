# `prefer-lazy-imports`

Prefer deferred imports for heavy dependencies of JupyterLab plugins.

## Why

Everything a plugin module imports at the top is downloaded, parsed and evaluated before JupyterLab can start, even when the code is only needed after a user action. Moving such an import into the function which uses it puts it in a separate bundle chunk, which the browser fetches on demand.

Core uses this pattern already, for example in `csvviewer` for `@lumino/datagrid`, in `codemirror-extension` for the settings form validator, and in `json-extension` for its own renderer module. Adopting it in third-party extensions is expected to cut cold load time noticeably, since every installed extension adds to the startup cost.

## Rule details

The rule only looks at plugin modules: files which declare a value typed `JupyterFrontEndPlugin` or `ServiceManagerPlugin`, or which contain an object literal with the shape of a plugin. Array, union and `Promise` wrappers are recognised, as are `as` and `satisfies` casts, factory function return types, and type imports renamed through an alias.

In such a file, an import is reported when every runtime use of its bindings sits inside a function body, a method, or an instance field initializer, so that turning it into `await import()` is a mechanical change. An import which is needed while the module is evaluated is left alone, because the module is fetched at startup regardless of how the other bindings are written.

These never produce a report:

- Packages the application already loads eagerly, listed under [Options](#options).
- `import type`, type-only specifiers, and bindings used only in type positions. TypeScript erases all of them.
- Side-effect imports such as `import '../style/index.css'`, which have no binding to move.
- Assets handled by a bundler loader: `.css`, `.svg`, `.png`, `.wasm`, `.json` and similar.
- Tokens referenced in `requires`, `optional` or `provides`. JupyterLab reads those when the plugin is registered, so they can never be deferred.
- Sources which the same file re-exports with `export { X } from '...'` or `export * from '...'`, since the re-export keeps them in the startup bundle.
- Bindings whose only use is inside a helper which is itself called while the module is evaluated.

A dynamic `import()` written at module level is reported separately, because it runs at load time and defers nothing.

The rule has no autofix. The enclosing function usually has to become `async`, which changes its signature, so the change is left to the author.

## Incorrect

```ts
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { HeavyWidget } from './widget';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.shell.add(new HeavyWidget(), 'main');
  }
};
```

```ts
// Pulls in the whole Notebook application package for one instance check
import { NotebookShell } from '@jupyter-notebook/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  activate: app => {
    if (app.shell instanceof NotebookShell) {
      // ...
    }
  }
};
```

## Correct

```ts
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    const { HeavyWidget } = await import('./widget');
    app.shell.add(new HeavyWidget(), 'main');
  }
};
```

When `activate` cannot become `async`, defer inside the command or factory which needs the module:

```ts
activate: (app: JupyterFrontEnd) => {
  app.commands.addCommand(CommandIDs.open, {
    execute: async () => {
      const { HeavyWidget } = await import('./widget');
      app.shell.add(new HeavyWidget(), 'main');
    }
  });
};
```

Types can still be imported at the top, because TypeScript erases them:

```ts
import type { HeavyWidget } from './widget';
```

## Options

### `allowedPackages`

Packages which the application loads eagerly anyway, so importing them at the top of a plugin module costs nothing. `*` matches any run of characters, and a `!` prefix denies a package matched by an earlier pattern. Subpath imports are matched against their owning package, so `@jupyterlab/*` covers `@jupyterlab/services/lib/kernel`.

Setting this option replaces the default list, which is the singleton list from JupyterLab's `staging/package.json` minus `@lumino/datagrid`:

```ts
{
  "allowedPackages": [
    "@jupyterlab/*",
    "@lumino/*",
    "!@lumino/datagrid",
    "@jupyter/ydoc",
    "@jupyter/react-components",
    "@jupyter/web-components",
    "@codemirror/language",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@microsoft/fast-element",
    "@microsoft/fast-foundation",
    "react",
    "react-dom",
    "yjs"
  ]
}
```

`@lumino/datagrid` is denied because core defers it too, in `packages/csvviewer`.

A monorepo which shares its own packages between extensions should add them, keeping the defaults it still needs:

```ts
{
  "allowedPackages": [
    "@jupyterlab/*",
    "@lumino/*",
    "!@lumino/datagrid",
    "react",
    "react-dom",
    "@myorg/*"
  ]
}
```

### `ignoreImports`

Import specifiers to skip, matched with the same `*` wildcards. Use it for modules which are too small for a separate chunk to pay off, such as a file of command identifiers:

```ts
{
  "ignoreImports": ["./commands", "./constants"]
}
```

### `reportModuleLevelUsage`

Off by default. When enabled, imports used while the module is evaluated are reported as well, so that the file can be restructured to need less at load time. Tokens in `requires`, `optional` and `provides` stay exempt. This also reports aggregator modules which import plugin objects into an exported array, so expect considerably more findings.

```ts
{
  "reportModuleLevelUsage": true
}
```

## Limitations

The rule sees one file at a time. If another module in the same bundle imports the same source eagerly, deferring it here moves nothing out of the startup chunk, and the rule cannot tell. It also cannot judge how large a module is, so a module of string constants is reported the same way as a widget; `ignoreImports` is the way to silence those.

Value re-exports are not reported, only taken into account. Splitting an entry point which re-exports its own implementation is a larger refactor than this rule tries to describe.
