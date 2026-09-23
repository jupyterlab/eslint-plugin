# `no-schema-enum`

Disallow `enum` in settings JSON schema files; use `oneOf` with `const`, `title`, and an explicit `type` instead.

## Examples

### Give string choices readable labels

These are setting definitions within a `schema/*.json` file. Keep stored values stable while adding labels that can be translated.

**Incorrect**

```json
{
  "type": "string",
  "enum": ["fit-to-width", "fit-to-height"]
}
```

**Correct**

```json
{
  "type": "string",
  "oneOf": [
    { "const": "fit-to-width", "title": "Fit to width" },
    { "const": "fit-to-height", "title": "Fit to height" }
  ]
}
```

### Declare the type of string choices

Labels alone are not enough: the containing setting needs `type` for the editor to render string choices. This missing type can be fixed automatically.

**Incorrect**

```json
{
  "oneOf": [
    { "const": "light", "title": "Light theme" },
    { "const": "dark", "title": "Dark theme" }
  ]
}
```

**Correct**

```json
{
  "type": "string",
  "oneOf": [
    { "const": "light", "title": "Light theme" },
    { "const": "dark", "title": "Dark theme" }
  ]
}
```

### Label numeric choices

The rule also reports numeric `enum` arrays. Keep the numeric type and values when adding labels.

**Incorrect**

```json
{
  "type": "integer",
  "enum": [2, 4, 8]
}
```

**Correct**

```json
{
  "type": "integer",
  "oneOf": [
    { "const": 2, "title": "Two spaces" },
    { "const": 4, "title": "Four spaces" },
    { "const": 8, "title": "Eight spaces" }
  ]
}
```

## Why

With `enum`, users see stored values such as `fit-to-width`, and the schema cannot associate them with translatable labels. With `oneOf`, each `title` provides a readable, translatable label while `const` preserves the stored value.

String choices also need `"type": "string"` on the containing setting so the settings editor can render the control. The rule can add a missing type automatically.

## Options

This rule has no options.

## Configuration

This rule checks JSON files inside a `schema/` directory. Configure [`jsonc-eslint-parser`](https://github.com/ota-meshi/jsonc-eslint-parser) (v2) for those files:

```js
import * as jsoncParser from 'jsonc-eslint-parser';
import jupyterPlugin from '@jupyter/eslint-plugin';

export default [
  {
    files: ['**/schema/*.json'],
    languageOptions: { parser: jsoncParser },
    plugins: { jupyter: jupyterPlugin },
    rules: {
      'jupyter/no-schema-enum': 'error'
    }
  }
];
```

<details>
<summary>Which schema values are checked?</summary>

The rule reports `enum` properties whose value is an array in JSON files directly inside a `schema/` directory. It also reports a missing sibling `type` when every `oneOf` choice has a string `const`. It does not add types to numeric or mixed choices, and it does not check JSON files outside these schema directories.

</details>
