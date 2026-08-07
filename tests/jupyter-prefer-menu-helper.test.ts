/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import preferMenuHelper from '../src/rules/prefer-menu-helper';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('prefer-menu-helper', preferMenuHelper, {
  valid: [
    {
      code: `await page.menu.clickMenuItem('File>New>Terminal');`
    },
    {
      code: `await page.click('text=README.md');`
    },
    {
      code: `await page.click('text=File Browser');`
    },
    {
      code: `await page.click('text=New File');`
    },
    {
      code: `await page.click('text="New"');`
    },
    {
      code: `await page.click('[title="File Browser"]');`
    },
    {
      code: `await page.click('#jp-filebrowser');`
    },
    {
      code: `await page.click('.lm-Menu ul[role="listbox"] >> text=New');`
    },
    {
      code: `await page.click(\`text=\${label}\`);`
    },
    {
      code: `await other.click('text=File');`
    },
    {
      code: `await page.locator('text=Settings Panel').click();`
    },
    {
      code: `await page.getByText('File Browser').click();`
    },
    {
      code: `await page.getByText('New').click();`
    },
    {
      code: `await menu.getByText('Scratchpad console').click();`
    },
    {
      code: `await page.getByRole('menuitem', { name: 'New' }).click();`
    },
    {
      code: `await newTab.getByRole('menuitem', { name: 'Run', exact: true }).click();`
    },
    {
      code: `await page.click('.lm-Menu li[role="menuitem"]:has-text("Editor")');`
    },
    {
      code: `
        let menuItem = page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true });
        menuItem = page.locator('button');
        await menuItem.click();
      `
    },
    {
      code: `
        const menuItem = page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true });
        async function clickItem(menuItem) {
          await menuItem.click();
        }
      `
    },
    {
      code: `
        await page.click('text="New"');
        await page
          .locator('[data-command="notebook:create-new"] >> text="Python 3 (ipykernel)"')
          .click();
      `
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.click('text=Open With');
      `
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Open With' }).click();
        await page.click('.lm-Menu ul[role="menu"] >> text=Notebook (no kernel)');
      `
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.getByRole('menu').getByRole('menuitem', { name: 'Open With' }).click();
        await page.click('.lm-Menu ul[role="menu"] >> text=Notebook (no kernel)');
      `
    },
    {
      code: `
        await page.menu.openContextMenuLocator('.jp-DirListing-item');
        await page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('Open With', { exact: true })
          .click();
        await page.click('.lm-Menu ul[role="menu"] >> text=Notebook (no kernel)');
      `
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.click('.lm-Menu ul[role="menu"] >> text=Open With');
        await page.click('.lm-Menu ul[role="menu"] >> text=Notebook (no kernel)');
      `
    },
    {
      code: `
        await page.menu.openContextMenuLocator('.jp-DirListing-item');
        await page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('Open With', { exact: true })
          .click();
      `
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.locator('li[data-type=submenu]', { hasText: /^Open With$/ }).click();
        await page.getByRole('menuitem', { name: 'Notebook', exact: true }).click();
      `
    }
  ],

  invalid: [
    {
      code: `await page.click('text=File');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('text="Tabs"');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.locator('text=Run').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('li[role="menuitem"]:has-text("Kernel")');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('li:has(div.lm-MenuBar-itemLabel:text-is("File"))');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.locator('li:has(div.lm-MenuBar-itemLabel:text("Settings"))').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.locator('li:has(div.lm-MenuBar-itemLabel:text-is("Help"))').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.getByRole('menuitem', { name: 'Settings' }).click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.getByRole('menubar').getByRole('menuitem', { name: 'File' }).click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.getByText('File').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.getByText('Settings', { exact: true }).hover();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=New');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click(".lm-Menu ul[role='menu'] >> text=New");`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role = menu] >> text=New');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Terminal');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.hover('.lm-Menu ul[role="menu"] >> text=Text File');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.locator('#jp-mainmenu-file').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.locator('#jp-mainmenu-new').click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click(\`.lm-Menu ul[role="menu"] >> text="\${menuOption}"\`);`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true })
          .click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        const fileMenuNewItem = page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true });
        await fileMenuNewItem.click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        let fileMenuNewItem;
        fileMenuNewItem = page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true });
        await fileMenuNewItem.click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.getByRole('menuitem', { name: 'Settings' }).click();
        await page.locator('li[data-type=submenu]', { hasText: /^Theme$/ }).click();
        await page.getByRole('menuitem', { name: 'JupyterLab Dark', exact: true }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.getByRole('menuitem', { name: 'Settings' }).click();
        await page.getByRole('menu').getByRole('menuitem', { name: 'Theme' }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.getByRole('menuitem', { name: 'Settings' }).click();
        await page.getByRole('menu').getByRole('menuitem', { name: 'Theme' }).hover();
        await page.getByRole('menu').getByRole('menuitem', { name: 'JupyterLab Dark' }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.getByRole('menuitem', { name: 'File' }).click();
        const openFromPath = page.getByRole('menuitem', { name: 'Open from Path' });
        await openFromPath.click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.click('text=New');
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.click('li[data-type=submenu] >> text=New');
        await page.click('text=Terminal');
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.click('.lm-Menu ul[role="menu"] >> text=New');
        await page.click('text=Terminal');
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page
          .locator('.lm-Menu ul[role="menu"]')
          .getByText('New', { exact: true })
          .click();
        await page.click('text=Terminal');
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.getByText('New').click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.click('text=Open from Path');
        await page.getByRole('menuitem', { name: 'Open With' }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.keyboard.press('ArrowDown');
        await page.click('text=Open from Path');
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=File');
        await page.keyboard.press('Escape');
        await page.click('text=Open from Path');
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.getByRole('menuitem', { name: 'Settings' }).click();
        await page.locator('li[data-type=submenu]', { hasText: /^Theme$/ }).click();
        await page.getByRole('menuitem', { name: 'JupyterLab Dark', exact: true }).click();
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Open With' }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('text=Settings');
        if (dark) {
          await page.getByRole('menuitem', { name: 'JupyterLab Dark', exact: true }).click();
        }
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.locator('#jp-mainmenu-file-new').hover();
        await page.getByRole('menuitem', { name: 'Terminal', exact: true }).click();
      `,
      errors: [
        { messageId: 'preferMenuHelper' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.click('#jp-mainmenu-file-new >> text=Terminal');
        await page.getByRole('menuitem', { name: 'Open With' }).click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.click('text=File');
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Open With' }).click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.click('.lm-Menu ul[role="menu"] >> text=Rename');
        await page.click('text=File');
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.locator('.jp-DirListing-item').waitFor();
        await page.click('text=File');
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.locator('#jp-mainmenu-file').click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `
        await page.locator('.jp-DirListing-item').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'File' }).click();
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    }
  ]
});
