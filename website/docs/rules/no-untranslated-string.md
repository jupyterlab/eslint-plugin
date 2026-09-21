# `no-untranslated-string`

Wrap user-facing text in a translation call such as `trans.__()`.

## Examples

### Translate a command label

**Incorrect**

```ts
commands.addCommand('file-download', { label: 'Download' });
```

**Correct**

```ts
commands.addCommand('file-download', { label: trans.__('Download') });
```

### Translate a label returned by a function

**Incorrect**

```ts
commands.addCommand('file-download', { label: () => 'Download' });
```

**Correct**

```ts
commands.addCommand('file-download', { label: () => trans.__('Download') });
```

### Translate accessibility labels

Text read by assistive technology needs translation too. The equivalent `node.ariaLabel` assignment is checked as well.

**Incorrect**

```ts
node.setAttribute('aria-label', 'Download file');
```

**Correct**

```ts
node.setAttribute('aria-label', trans.__('Download file'));
```

### Translate a widget title

**Incorrect**

```ts
this.title.label = 'Source';
```

**Correct**

```ts
this.title.label = trans.__('Source');
```

### Translate dialog text

The same requirement applies to `new Dialog()`.

**Incorrect**

```ts
showDialog({ title: 'Confirm', body: 'Are you sure?' });
```

**Correct**

```ts
showDialog({ title: trans.__('Confirm'), body: trans.__('Are you sure?') });
```

### Translate a dialog button

**Incorrect**

```ts
Dialog.okButton({ label: 'Build' });
```

**Correct**

```ts
Dialog.okButton({ label: trans.__('Build') });
```

### Translate text assigned to the DOM

**Incorrect**

```ts
element.textContent = 'Save';
```

**Correct**

```ts
element.textContent = trans.__('Save');
```

### Translate labels passed in options

Configured property names are checked even for custom widgets. This also covers a launcher entry’s `category`.

**Incorrect**

```ts
new MyField({ ...options, label: 'My field' });
```

**Correct**

```ts
new MyField({ ...options, label: trans.__('My field') });
```

### Translate JSX text

Wrapping raw text in braces, such as `<span>{'Error message:'}</span>`, does not translate it.

**Incorrect**

```tsx
const message = <span>Error message:</span>;
```

**Correct**

```tsx
const message = <span>{trans.__('Error message:')}</span>;
```

### Translate a JSX attribute

**Incorrect**

```tsx
const checkbox = <MyCheckbox label="Enable feature" />;
```

**Correct**

```tsx
const checkbox = <MyCheckbox label={trans.__('Enable feature')} />;
```

### Translate both conditional branches

**Incorrect**

```tsx
const button = <button title={visible ? 'Hide layer' : 'Show layer'} />;
```

**Correct**

```tsx
const button = (
  <button title={visible ? trans.__('Hide layer') : trans.__('Show layer')} />
);
```

### Translate a fallback value

**Incorrect**

```ts
const options = { label: name ?? 'Untitled' };
```

**Correct**

```ts
const options = { label: name ?? trans.__('Untitled') };
```

## Why

Untranslated labels remain in the original language even when users select a different language for JupyterLab. Translate visible text and accessibility labels so both sighted users and screen reader users receive localized text.

## Options

Defaults:

```json
{
  "enforcePunctuation": false,
  "checkProperties": [
    "alt",
    "aria-description",
    "aria-label",
    "caption",
    "category",
    "label",
    "placeholder",
    "title",
    "tooltip",
    "textContent",
    "innerText"
  ]
}
```

### `enforcePunctuation`

Set to `true` to require translation of punctuation such as `/`, `-` and `+`. Blank strings and bare numbers are never reported.

```ts
// Reported only when enforcePunctuation is true.
item.textContent = '/';
```

### `checkProperties`

Names of object properties, DOM attributes, assignment targets and JSX attributes to check. Hyphenated and camelCase spellings are equivalent: either `aria-label` or `ariaLabel` covers both.

This list **replaces** the defaults. Pass `[]` to turn off these configurable checks. Command text, dialog text, dialog button labels and JSX text are still checked.

<details>
<summary>Which text is checked?</summary>

The rule checks string literals and template literals without interpolation in:

- Command `label`, `caption` and `usage` properties, including concise arrow functions returning text.
- `showDialog()` and `new Dialog()` titles and bodies.
- Labels passed to `Dialog.okButton()`, `cancelButton()`, `warnButton()` and `errorButton()`.
- JSX text, including string literals inside braces.
- The names in `checkProperties`, on any object or element.

Conditional branches and fallback expressions are checked separately. Because property checks apply regardless of the receiving object, a configured name can also match text that is not shown to users. Adjust `checkProperties` or disable the rule for an intentional exception.

</details>
