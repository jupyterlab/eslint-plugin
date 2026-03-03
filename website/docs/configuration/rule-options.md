# Rule Options

Most rules in this plugin have no options.

## `jupyter/plugin-activation-args`

This rule supports one option object.

### `allowedFirstArgumentNames`

Controls allowed names for the first `activate` argument (the Jupyter application instance).

Default:

```json
{
  "allowedFirstArgumentNames": ["app", "_app", "_"]
}
```

Example override:

```js
export default [
  {
    rules: {
      'jupyter/plugin-activation-args': [
        'error',
        {
          allowedFirstArgumentNames: ['app', 'shellApp']
        }
      ]
    }
  }
];
```
