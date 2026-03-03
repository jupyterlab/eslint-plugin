# Flat Config

`eslint-plugin-jupyter` is designed for ESLint flat config.

## Minimal setup

```js
import tsParser from '@typescript-eslint/parser';
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
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

## Scope recommendations

- Apply the plugin to source files that define JupyterLab plugins and commands.
- Avoid applying it to generated files and test fixtures.
