# `galata-prefer-menu-helper`

Prefer Galata's `page.menu` helper over raw Playwright selectors for JupyterLab main menu traversal.

## Examples

### Follow a nested menu path

**Incorrect**

```ts
await page.click('text=File');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
```

**Correct**

```ts
await page.menu.clickMenuItem('File>New>Terminal');
```

### Open a menu without selecting an item

**Incorrect**

```ts
await page.locator('.lm-MenuBar-item').getByText('File').click();
```

**Correct**

```ts
await page.menu.openLocator('File');
```

### Open a menu using its accessible role

**Incorrect**

```ts
await page.getByRole('menuitem', { name: 'Settings' }).click();
```

**Correct**

```ts
await page.menu.openLocator('Settings');
```

### Context menus

Context menus share markup with the main menu, but `page.menu.clickMenuItem()` only traverses the main menu.

**Allowed**

```ts
await page.click('.jp-DirListing-item', { button: 'right' });
await page.click('.lm-Menu ul[role="menu"] >> text=Rename');
```

## Why

Raw clicks depend on which menu is already open and when its submenus appear. `page.menu.clickMenuItem()` closes open menus, follows the requested path and waits for each submenu. This makes a sequence such as opening a terminal easier to read and less prone to timing failures.

Use `page.menu.isOpen(path)` to check menu state and `page.menu.getMenuItemLocator(path)` to inspect an item. Prefer `openLocator()` and `getMenuItemLocator()` over the deprecated `open()` and `getMenuItem()` forms.

## Options

This rule has no options.

<details>
<summary>Scope and limitations</summary>

The rule checks main menu interactions, including locator chains and locators stored in unchanged `const` bindings. It does not recommend the main menu helper for context menus or toolbar dropdowns.

For generic menu selectors, the main menu must have been opened earlier in the same test. A `#jp-mainmenu-*` selector identifies a main menu directly. Bare labels such as `File` are checked only when the test title mentions a menu or the test contains menu markup. These limits avoid confusing menu items with files or dialog buttons.

Menu state is tracked only within the current test; calls into named helpers are not followed.

</details>
