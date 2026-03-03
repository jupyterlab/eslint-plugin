# `jupyter/plugin-description`

Ensure all `JupyterFrontEndPlugin` objects define a non-empty `description` property.

## Why

A plugin description improves readability for maintainers and integrators, especially in larger extension ecosystems.

## Rule details

The rule inspects `JupyterFrontEndPlugin` object declarations and reports when:

- `description` is missing
- `description` is an empty string

## Incorrect

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-notify:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Activated');
  }
};
```

## Correct

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-notify:plugin',
  description: 'Enhanced cell execution notifications for JupyterLab',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Activated');
  }
};
```

## Options

This rule has no options.
