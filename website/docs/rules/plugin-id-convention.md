# `plugin-id-convention`

Ensure JupyterLab plugin IDs are prefixed with the extension package name.

## Why

JupyterLab treats the part of a plugin ID before the first `:` as the extension
name. If a package ships plugins under a different prefix, extension-level
commands such as `jupyter labextension disable package-name` cannot reliably
apply to every plugin in that package.

## Rule details

The rule reads the nearest JupyterLab extension `package.json` and reports
literal plugin IDs that do not start with `<package name>:`. It also resolves
plugin IDs stored in local `const` string declarations.

MIME renderer extension entries (`IRenderMime.IExtension`) are registered as
plugins under their `id`, so the rule checks them the same way, in packages
that declare `jupyterlab.extension` or `jupyterlab.mimeExtension`.

For example, in a package with this manifest:

```json
{
  "name": "@jupyterlab/example-extension",
  "jupyterlab": {
    "extension": true
  }
}
```

## Incorrect

The plugin ID uses a different package prefix, so disabling
`@jupyterlab/example-extension` would not target this plugin by convention.

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/other-extension:plugin',
  autoStart: true,
  activate: () => {}
};
```

A MIME renderer entry under a different prefix is not disabled with the
package either.

```ts
const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/other-extension:factory',
  rendererFactory
};
```

## Correct

The plugin ID starts with the package name followed by `:`.

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/example-extension:plugin',
  autoStart: true,
  activate: () => {}
};
```

```ts
const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/example-extension:factory',
  rendererFactory
};
```

## Options

This rule has no options.
