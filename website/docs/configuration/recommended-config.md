# Recommended Config

The plugin exports a `recommended` config:

```js
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
  jupyterPlugin.configs.recommended
];
```

## What it enables

`recommended` sets all three plugin rules to `error`:

- `jupyter/plugin-activation-args`
- `jupyter/command-described-by`
- `jupyter/plugin-description`

## Override one rule

```js
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
  jupyterPlugin.configs.recommended,
  {
    rules: {
      'jupyter/command-described-by': 'warn'
    }
  }
];
```
