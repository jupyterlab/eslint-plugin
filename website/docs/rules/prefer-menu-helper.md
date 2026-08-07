# `prefer-menu-helper`

Prefer Galata's `MenuHelper` for opening JupyterLab main menu commands.

## Why

Raw Playwright selectors for main menu traversal are brittle. They depend on the current open menu state, hover timing, and translated or retitled menu labels. `page.menu.openLocator()` and `page.menu.clickMenuItem()` close any existing menus first, walk nested menus consistently, and wait for submenu activation.

## Rule details

The rule reports raw Playwright click or hover interactions when they target the JupyterLab main menu directly:

- Known top-level menu selectors such as `text=File`, `text=Settings`, `text=Tabs`, and `li[role="menuitem"]:has-text("Kernel")`.
- Lumino menu-bar label selectors such as `li:has(div.lm-MenuBar-itemLabel:text-is("File"))`.
- Lumino menu selectors such as `.lm-Menu ul[role="menu"]` when they are used directly or while traversing an opened main menu.
- JupyterLab main menu ids such as `#jp-mainmenu-file-new`.
- Playwright role locators for top-level menu items, such as `page.getByRole('menuitem', { name: 'Settings' })`.
- Playwright role locators scoped through `menu` or `menubar` roots, such as `page.getByRole('menubar').getByRole('menuitem', { name: 'File' })`.
- Playwright text locators for top-level menu items, such as `page.getByText('File')`.
- Follow-up role or submenu locators used immediately after a raw top-level main menu open.
- Locator chains and simple aliases rooted at those raw selectors.

Dynamic selectors are reported when their static parts clearly target a Lumino main menu. Raw context-menu flows are left to context-menu-specific rules. Files whose `test` fixture is imported from plain `@playwright/test`, rather than `@jupyterlab/galata`, are skipped because `page.menu` is not available there. Use `page.menu.openLocator()` when the test needs to leave a menu open for a screenshot; use `page.menu.clickMenuItem()` when the test needs to execute a command. The recommended config enables this rule as a warning so downstream projects can clean up existing raw menu traversals before promoting it to an error.

## Incorrect

```ts
await page.click('text=File');
await page.click('text=Open from Path');
await page.click('li[role="menuitem"]:has-text("Kernel")');
await page.click('li:has(div.lm-MenuBar-itemLabel:text-is("File"))');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);
await page.getByRole('menuitem', { name: 'Settings' }).click();
await page.getByRole('menubar').getByRole('menuitem', { name: 'File' }).click();
await page.getByText('File').click();
await page.locator('li[data-type=submenu]', { hasText: /^Theme$/ }).click();
await page.getByRole('menuitem', { name: 'JupyterLab Dark', exact: true }).click();
```

## Correct

```ts
await page.menu.clickMenuItem('File>New>Terminal');
await page.menu.openLocator('File>New');
```

## Options

This rule has no options.
