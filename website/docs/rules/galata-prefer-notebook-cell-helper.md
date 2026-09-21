# `galata-prefer-notebook-cell-helper`

Prefer the Galata `page.notebook` helper over raw Playwright selectors and keyboard shortcuts for notebook cell operations.

## Examples

### Set and run the first cell

**Incorrect**

```ts
await page
  .locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  )
  .first()
  .fill('print("hello")');
await page.keyboard.press('Control+Enter');
```

**Correct**

```ts
await page.notebook.setCell(0, 'code', 'print("hello")');
await page.notebook.runCell(0);
```

### Enter editing mode

**Incorrect**

```ts
await page.locator('.jp-Cell-inputArea').first().click();
```

**Correct**

```ts
await page.notebook.enterCellEditingMode(0);
```

### Select the third cell

Cell indexes start at zero.

**Incorrect**

```ts
await page.locator('.jp-Cell').nth(2).click();
```

**Correct**

```ts
await page.notebook.selectCells(2);
```

### Console input

The console reuses editor markup but is not a notebook cell.

**Allowed**

```ts
await page
  .locator(
    '.jp-CodeConsole-input >> .cm-editor >> .cm-content[contenteditable="true"]'
  )
  .fill('print("hello")');
```

## Why

Raw cell selectors depend on notebook markup and skip the readiness checks built into Galata. The helpers describe the action directly: set the source, select a cell or run it.

## Options

This rule has no options.

## Choosing a helper

`setCell()` replaces the entire cell source. Raw `type()` and `pressSequentially()` append at the caret, so check that replacing the source is what your test intends.

To start execution without waiting for completion, use:

```ts
await page.notebook.runCell(0, { wait: false });
```

Keep raw keyboard interactions when the shortcut or its focus behavior is itself under test; disable the rule for that line if needed.

<details>
<summary>Scope and limitations</summary>

The rule checks interactions on `page` that clearly target notebook cells, including static selectors and locators stored in unchanged `const` bindings. It skips selectors with unknown interpolated values, selector unions or sibling combinators, and selectors scoped to consoles, dialogs, file editors or terminals.

A bare run shortcut is reported only immediately after a reported cell interaction in the same block, allowing intervening assertions. Otherwise the rule cannot tell which widget has focus. Locators returned by `page.notebook.getCellLocator()` are not reported.

</details>
