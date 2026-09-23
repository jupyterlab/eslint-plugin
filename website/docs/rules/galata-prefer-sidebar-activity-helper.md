# `galata-prefer-sidebar-activity-helper`

Prefer Galata's sidebar and activity helpers over raw Playwright selectors when opening sidebar tabs or activating main area tabs.

## Examples

### Open Running Terminals and Kernels

**Incorrect**

```ts
await page.click('[title="Running Terminals and Kernels"]');
```

**Correct**

```ts
await page.sidebar.openTab('jp-running-sessions');
```

### Open the property inspector

**Incorrect**

```ts
await page.locator('[title="Property Inspector"]').click();
```

**Correct**

```ts
await page.sidebar.openTab('jp-property-inspector');
```

### Open the file browser

**Incorrect**

```ts
await page.getByRole('tab', { name: 'File Browser' }).click();
```

**Correct**

```ts
await page.sidebar.openTab('filebrowser');
```

### Activate a document tab

**Incorrect**

```ts
await page.click('div[role="main"] >> text=Lorenz.ipynb');
```

**Correct**

```ts
await page.activity.activateTab('Lorenz.ipynb');
```

## Why

Raw title and text selectors depend on user-facing labels and do not wait for JupyterLab's tab activation state. Galata's helpers target stable tab identifiers or activity names and include the activation checks that make tests less flaky.

## Options

This rule has no options.

<details>
<summary>Which tab interactions are checked?</summary>

The rule checks clicks on known sidebar tab titles, equivalent `getByRole('tab', { name })` locators, and text selectors scoped to main area tabs.

</details>
