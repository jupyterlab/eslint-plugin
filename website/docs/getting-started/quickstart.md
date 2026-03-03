# Quickstart

Create or update your ESLint flat config:

```js
// eslint.config.js
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      jupyter: jupyterPlugin
    },
    rules: {
      'jupyter/command-described-by': 'error',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'error'
    }
  }
];
```

## Use recommended config

You can also reuse the plugin’s predefined recommended config:

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
