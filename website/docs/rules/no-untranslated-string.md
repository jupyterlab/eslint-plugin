# `jupyter/no-untranslated-string`

Require user-facing string literals to be wrapped in a translation call such as `trans.__()`.

## Rule details

The rule reports raw string literals (and template literals without expressions) in the following positions:

### 1. `commands.addCommand()` properties

The `label`, `caption`, and `description` properties of a command registration must not contain bare string literals. Concise arrow functions that return a raw string (e.g. `() => 'string'`) are also flagged.

#### Incorrect

```ts
commands.addCommand('file-download', {
  label: 'Download',
  caption: 'Download the file',
  execute: () => { /* ... */ }
});
```

#### Correct

```ts
commands.addCommand('file-download', {
  label: trans.__('Download'),
  caption: trans.__('Download the file'),
  execute: () => { /* ... */ }
});
```

---

### 2. `element.setAttribute()` with accessibility attributes

The second argument of `setAttribute` must not be a raw string when the attribute is `aria-label`, `aria-description`, or `title`.

#### Incorrect

```ts
node.setAttribute('aria-label', 'main sidebar');
```

#### Correct

```ts
node.setAttribute('aria-label', trans.__('main sidebar'));
```

---

### 3. Direct assignment to `title` and `ariaLabel`

Assigning a raw string literal to `element.title` or `element.ariaLabel` is flagged.

#### Incorrect

```ts
element.title = 'Close Tab';
```

#### Correct

```ts
element.title = trans.__('Close Tab');
```

## Options

This rule has no options.
