# `prefer-lazy-imports`

Prefer deferred imports for heavy dependencies of JupyterLab plugins.

## Why

Everything a plugin module imports at the top is downloaded, parsed and evaluated before JupyterLab can start, even when the code is only needed after a user action. Moving such an import into the function which uses it puts it in a separate bundle chunk, which the browser fetches on demand.

Core JupyterLab uses this pattern, for example in `csvviewer` for `@lumino/datagrid`, in `codemirror-extension` for the settings form validator, and in `json-extension` for its own renderer module. Adopting it in third-party extensions is expected to cut cold load time noticeably, since every installed extension adds to the startup cost.

## Rule details

The rule only looks at plugin modules: files which declare a value typed `JupyterFrontEndPlugin` or `ServiceManagerPlugin`, or which contain an object literal with the shape of a plugin. Array, union and `Promise` wrappers are recognised, as are `as` and `satisfies` casts, factory function return types, and type imports renamed through an alias.

In such a file, an import is reported when every runtime use of its bindings sits inside a function body, a method, or an instance field initializer, so that turning it into `await import()` is a mechanical change. An import which is needed while the module is evaluated is left alone, because the module is fetched at startup regardless of how the other bindings are written.

These never produce a report:

- Packages the application already loads eagerly, listed under [Options](#options).
- `import type`, type-only specifiers, and bindings used only in type positions. TypeScript erases all of them.
- Side-effect imports such as `import '../style/index.css'`, which have no binding to move.
- Assets which never become bundled bytes, described under [Assets](#assets).
- Tokens referenced in `requires`, `optional` or `provides`. JupyterLab reads those when the plugin is registered, so they can never be deferred.
- Sources which the same file re-exports with `export { X } from '...'` or `export * from '...'`, since the re-export keeps them in the startup bundle.
- Bindings whose only use is inside a helper which is itself called while the module is evaluated.
- Modules holding less code than [`minimumSize`](#minimumsize), because a separate chunk costs more than it saves.

A dynamic `import()` written at module level is reported separately, because it runs at load time and defers nothing.

The rule has no autofix. The enclosing function usually has to become `async`, which changes its signature, so the change is left to the author.

## Assumptions

The rule targets the build JupyterLab extensions normally use: rspack driven by `@jupyter/builder`, with Module Federation sharing packages between the application and the extensions it loads. Webpack behaves the same way, because the builder configuration uses the API both share.

Deferring pays off at all because that build turns `await import()` into a chunk the browser fetches on first use. [`allowedPackages`](#allowedpackages) can treat a package as free because Module Federation provides shared packages at runtime instead of bundling them. [`minimumSize`](#minimumsize) has a floor above zero because each chunk carries some bundler runtime of its own.

Under a different bundler the asset handling below does not apply. Under a different application the shared packages differ. Notebook and JupyterLite declare their own lists, and a monorepo which shares its own packages should add them to `allowedPackages`.

## Assets

Whether deferring an asset helps depends on what the bundler does with it.

An asset which is inlined into the JavaScript adds its full size to the startup chunk, and is measured against `minimumSize` like any module. The builder loads `.svg` imported from JavaScript as `asset/source`, which means the whole file arrives as a string in the bundle. The same applies to `.raw.css`, `.md` and `.txt`, and to `.json`, which rspack parses into an object and inlines. A large illustration imported at the top of a plugin module is exactly the case this rule is for.

An asset which becomes a URL is never reported. Images and fonts (`.png`, `.jpg`, `.gif`, `.woff2`, `.ttf` and the rest) are `asset/resource`, so they are always emitted as separate files and the browser fetches them only when they are used. `.wasm` and `.html` are left alone for the same reason.

A stylesheet is never reported either. `import '../style/index.css'` has no binding to move, and a `.css` import which does have one goes through `style-loader`, which applies it when it is imported. Deferring that would change when the styles take effect rather than only what is downloaded.

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

Import specifiers to skip, matched with the same `*` wildcards:

```ts
{
  "ignoreImports": ["./generated/*", "@myorg/internal"]
}
```

### `minimumSize`

The smallest module worth deferring, in bytes, default `4096`. Set it to `0` to report every module whatever its size.

The rule resolves a relative import on disk and measures the code in it, plus the code of everything it statically imports by relative path. Comments and type declarations are removed first, because TypeScript erases them and they never reach the bundle. This is what keeps a file of interfaces from being reported: `shortcuts-extension/src/types.ts` is 7 KB of source but 968 bytes once compiled, and the rule measures 562 bytes.

Measuring the closure rather than the single file matters just as much in the other direction. `shortcuts-extension/src/renderer.tsx` is 409 bytes on its own and 56 KB once its imports are counted.

Bare package specifiers are not measured. A package which is not in `allowedPackages` is not in the shared runtime, so it is bundled into the extension and always counts as worth deferring. A module which cannot be read is reported too, so a missing file never hides a finding.

The default is set where the benefit stops being worth the change. An async chunk carries a few hundred bytes of bundler runtime and costs one request, so at about a kilobyte the saving cancels out. Above that the gain per import falls away quickly, because a handful of large modules hold nearly all the weight.

Analysis of 1621 files in core and 21 Jupyter extensions produced the following:

| `minimumSize` | Imports reported | Code covered |
| ------------- | ---------------- | ------------ |
| `0`           | 100%             | 100%         |
| `1024`        | 86%              | 100%         |
| `2048`        | 71%              | 99%          |
| `4096`        | 51%              | 96%          |
| `8192`        | 38%              | 93%          |
| `16384`       | 17%              | 80%          |

You can lower `minimumSize` to `1024` to increase the coverage, at the cost of roughly twice as many reports. Raising it to `8192` or higher allowsd to restrict the repots further to largest modules only.

```ts
{
  "minimumSize": 1024
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

The rule sees one file at a time. If another module in the same bundle imports the same source eagerly, deferring it here moves nothing out of the startup chunk, and the rule cannot tell.

Sizes are an estimate. The rule counts source bytes after stripping comments and type declarations, which tracks the compiled output closely but is not the same as bundled and minified bytes. It also stops at package boundaries, so a small module which pulls in a large dependency is measured as small.

Value re-exports are not reported, only taken into account. Splitting an entry point which re-exports its own implementation is a larger refactor than this rule tries to describe.
