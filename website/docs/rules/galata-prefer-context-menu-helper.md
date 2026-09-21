# `galata-prefer-context-menu-helper`

Use Galata's document-opening helpers instead of separate Playwright actions to navigate the file browser's `Open With` menu.

## Examples

### Open a notebook without a kernel

The notebook helper selects the no-kernel factory and waits for the document to be revealed.

**Incorrect**

```ts
await page.click('.jp-DirListing-item >> text=notebook.ipynb', {
  button: 'right'
});
await page.hover('text=Open With');
await page.click('text=Notebook (no kernel)');
await page.waitForSelector('.jp-NotebookPanel');
```

**Correct**

```ts
await page.notebook.open('notebook.ipynb', { noKernel: true });
```

### Choose Markdown Preview

Pass the desired factory as the second argument.

**Incorrect**

```ts
await page.click('.jp-DirListing-item >> text=README.md', { button: 'right' });
await page.click('text=Open With');
await page.click('.lm-Menu-itemLabel:text("Markdown Preview")');
```

**Correct**

```ts
await page.filebrowser.open('README.md', 'Markdown Preview');
```

### Choose CSV Viewer using role locators

**Incorrect**

```ts
await page.menu.openContextMenu('.jp-DirListing-item >> text=data.csv');
await page.getByText('Open With').hover();
await page.getByRole('menuitem', { name: 'CSV Viewer' }).click();
```

**Correct**

```ts
await page.filebrowser.open('data.csv', 'CSV Viewer');
```

## Why

Opening a document with separate Playwright actions requires a right-click, a submenu interaction, a factory selection and a wait. Each step can break when the interface or its timing changes. The helpers express the intended action in one call and wait for the document to be revealed.

## Options

This rule has no options.

<details>
<summary>Which interactions are checked?</summary>

The rule reports the factory click after a file browser context menu and its `Open With` submenu have been opened in the same test. Waits between these steps are allowed. It recommends `page.notebook.open(name, { noKernel: true })` for the no-kernel notebook factory and `page.filebrowser.open(path, factory)` for other factories.

</details>
