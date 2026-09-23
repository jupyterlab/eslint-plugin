# `require-soft-assertions-before-snapshots`

Require `expect.soft()` for snapshot assertions that are not the last in a Playwright test block.

## Examples

### Capture each step after a mismatch

A mismatch in `before.png` should not prevent capturing `after.png`.

**Incorrect**

```ts
test('multi-step screenshot', async ({ page }) => {
  expect(await page.screenshot()).toMatchSnapshot('before.png');
  await page.getByRole('button', { name: 'Open' }).click();
  expect(await page.screenshot()).toMatchSnapshot('after.png');
});
```

**Correct**

```ts
test('multi-step screenshot', async ({ page }) => {
  expect.soft(await page.screenshot()).toMatchSnapshot('before.png');
  await page.getByRole('button', { name: 'Open' }).click();
  expect(await page.screenshot()).toMatchSnapshot('after.png');
});
```

### Keep all earlier snapshots soft

Making only the first assertion soft is not enough. Every snapshot before the last must be soft; the last can also be soft.

**Incorrect**

```ts
test('three views', async ({ page }) => {
  expect.soft(await page.screenshot()).toMatchSnapshot('first.png');
  await showSecondView(page);
  expect(await page.screenshot()).toMatchSnapshot('second.png');
  await showThirdView(page);
  expect.soft(await page.screenshot()).toMatchSnapshot('third.png');
});
```

**Correct**

```ts
test('three views', async ({ page }) => {
  expect.soft(await page.screenshot()).toMatchSnapshot('first.png');
  await showSecondView(page);
  expect.soft(await page.screenshot()).toMatchSnapshot('second.png');
  await showThirdView(page);
  expect.soft(await page.screenshot()).toMatchSnapshot('third.png');
});
```

### Keep readiness assertions hard

The rule does not require changing non-snapshot assertions. A failed readiness check may still stop the test.

**Allowed**

```ts
test('ready panel', async ({ page }) => {
  await expect(page.getByRole('tabpanel')).toBeVisible();
  expect.soft(await page.screenshot()).toMatchSnapshot('panel.png');
  await openDetails(page);
  expect(await page.screenshot()).toMatchSnapshot('details.png');
});
```

### Take a single snapshot

There are no later snapshots to preserve, so a hard assertion is fine.

**Allowed**

```ts
test('single screenshot', async ({ page }) => {
  expect(await page.screenshot()).toMatchSnapshot('page.png');
});
```

## Why

A hard snapshot assertion stops the test at its first failure. Later screenshots are never captured, so you cannot inspect all visual changes from that run. Use `expect.soft()` to continue to the remaining snapshots while still failing the test if any assertion fails. The last snapshot can use either form. Soft assertions also let `--update-snapshots` reach every snapshot in one run.

## Options

This rule has no options.

<details>
<summary>Which assertions are checked?</summary>

The rule checks `toMatchSnapshot()` assertions in `test()` and `it()` callbacks, including modifiers and hooks such as `test.only()` and `test.beforeEach()`. Other assertions, such as `toBeVisible()` and `toHaveScreenshot()`, are not checked.

</details>
