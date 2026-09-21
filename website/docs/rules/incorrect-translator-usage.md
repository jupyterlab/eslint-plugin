# `incorrect-translator-usage`

Store translation bundles under a name the translation extractor recognizes, such as `trans`.

## Examples

### Keep the bundle before translating

**Incorrect**

```ts
translator.load('jupyterlab').__('Open file');
```

**Correct**

```ts
const trans = translator.load('jupyterlab');
trans.__('Open file');
```

### Use a recognized variable name

**Incorrect**

```ts
const bundle = translator.load('jupyterlab');
bundle.__('Open file');
```

**Correct**

```ts
const trans = translator.load('jupyterlab');
trans.__('Open file');
```

### Store a bundle on a class

**Incorrect**

```ts
this._bundle = translator.load('mydomain');
this._bundle.__('Open file');
```

**Correct**

```ts
this._trans = translator.load('mydomain');
this._trans.__('Open file');
```

### Keep translation methods on the bundle

Destructuring loses the name the extractor uses to recognize translation calls.

**Incorrect**

```ts
const { __ } = translator.load('jupyterlab');
__('Open file');
```

**Correct**

```ts
const trans = translator.load('jupyterlab');
trans.__('Open file');
```

## Why

A translation call can run correctly but still be missing from language packs. The extractor recognizes only `trans`, `this.trans`, `this._trans`, `props.trans` and `this.props.trans`. Use one of these names so your messages can be collected for translation.

See the [JupyterLab translation rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Options

This rule has no options.

<details>
<summary>Which bundle uses are checked?</summary>

The rule checks `.load()` calls on objects whose names contain `translator`, including `nullTranslator`. It reports unrecognized storage names, destructuring, and translation methods called directly on the returned bundle. Unrelated `.load()` APIs are ignored.

Passing a bundle to another function or returning it is allowed; the receiving code must store it under a recognized name.

</details>
