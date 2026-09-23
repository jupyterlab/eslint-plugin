# `no-translation-concatenation`

Forbid concatenating dynamic values into JupyterLab translation messages.

## Examples

### Insert a user name

**Incorrect**

```ts
this.trans.__('Hello ' + userName);
```

**Correct**

```ts
this.trans.__('Hello %1', userName);
```

### Insert several values

Placeholders let translators change the order of the file and folder names.

**Incorrect**

```ts
trans.__('Move ' + fileName + ' to ' + folderName);
```

**Correct**

```ts
trans.__('Move %1 to %2', fileName, folderName);
```

### Translate complete plural messages

**Incorrect**

```ts
trans._n('Delete ' + n + ' file', 'Delete ' + n + ' files', n);
```

**Correct**

```ts
trans._n('Delete %1 file', 'Delete %1 files', n);
```

### Use a literal translation context

For an action in the file menu, write its context explicitly. If different contexts are needed, use separate calls with literal contexts.

**Incorrect**

```ts
trans._p('menu ' + section, 'Open');
```

**Correct**

```ts
trans._p('file menu', 'Open');
```

### Split a long literal across source lines

Concatenation is allowed when every part is literal text.

**Allowed**

```ts
trans.__('Part 1 of long message.\n' + 'Part 2 of long message.\n');
```

## Why

Building a message with `+` and a variable prevents the translation extractor from collecting the complete message. Use placeholders to keep the message intact and let translators choose where each value belongs. Concatenating only literal strings is allowed, for example to split a long message across source lines.

See the [JupyterLab translation rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Options

This rule has no options.

<details>
<summary>Which translation arguments are checked?</summary>

The rule checks concatenated message text and contexts on `trans`, `this.trans`, `this._trans`, `props.trans` and `this.props.trans`. Placeholder values, plural counts and the catalog domain can be dynamic.

For variables, interpolated templates and other dynamic messages, see [no-dynamic-translation](../no-dynamic-translation).

</details>
