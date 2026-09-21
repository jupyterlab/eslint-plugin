# `require-disposable-transfer`

Require calls returning `IDisposable` to transfer ownership to a caller, field,
or disposable collection.

## Examples

### Return the resource to its caller

In these examples, `createDisposable()` returns `IDisposable`; enable type-aware linting so the rule can identify that return type.

**Incorrect**

```ts
function createResource() {
  createDisposable();
}
```

**Correct**

```ts
function createResource() {
  return createDisposable();
}
```

### Give a resource to a disposable collection

A local variable keeps the value accessible only during construction. The collection keeps it until the owner is disposed.

**Incorrect**

```ts
class Owner {
  constructor() {
    const resource = createDisposable();
    console.log(resource);
  }

  dispose(): void {
    this._disposables.dispose();
  }

  private _disposables = new DisposableSet();
}
```

**Correct**

```ts
class Owner {
  constructor() {
    const resource = createDisposable();
    this._disposables.add(resource);
  }

  dispose(): void {
    this._disposables.dispose();
  }

  private _disposables = new DisposableSet();
}
```

### Run cleanup immediately

If the resource is no longer needed, call `dispose()` instead of dropping it.

**Incorrect**

```ts
function finishTask() {
  const resource = createDisposable();
  console.log(resource);
}
```

**Correct**

```ts
function finishTask() {
  const resource = createDisposable();
  resource.dispose();
}
```

### Pass a resource to a typed owner

With type information, a disposable parameter in an options object counts as a handoff. The application helper `ownResource()` must actually take responsibility for disposal; logging the same object does not.

**Incorrect**

```ts
const resource = createDisposable();
console.log({ resource });
```

**Correct**

```ts
declare function ownResource(options: { resource: IDisposable }): void;

const resource = createDisposable();
ownResource({ resource });
```

### Keep the collection returned by a factory

The collection owns its entries, but the collection itself also needs an owner or a disposal call.

**Incorrect**

```ts
DisposableSet.from([createDisposable()]);
```

**Correct**

```ts
const resources = DisposableSet.from([createDisposable()]);
resources.dispose();
```

## Why

Functions that return `IDisposable` hand cleanup responsibility to the caller.
Ignoring the returned value usually means the cleanup path has been lost.

## Usage

By default, the rule checks factory-named calls such as `create*`, `make*`, `build*` and `new*` that return `IDisposable` or `IObservableDisposable`. Type-aware linting is needed to identify these return types; the known Lumino `DisposableSet.from()` and `ObservableDisposableSet.from()` factories are recognized without it.

Values created directly in a Jupyter plugin’s `activate()` function are exempt because they commonly live for the application lifetime. A reported value can be returned, assigned to a field, put in a disposable collection, passed to an ownership helper or disposed. Keeping it in a local variable without arranging cleanup is not enough.

## Options

### `ownershipFunctionNames`

Function or method names that take ownership of disposable arguments, such as
`add`, `addWidget`, `insertWidget`, and `registerStatusItem`. For the full
default list see the
[`DEFAULT_OWNERSHIP_FUNCTION_NAMES`](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+const+DEFAULT_OWNERSHIP_FUNCTION_NAMES&type=code)
constant. Names given here are **added** to that default list.

### `extendDefaultOwnershipFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default ownership list instead of extending it.
With no `ownershipFunctionNames` of your own, `false` drops the defaults
entirely.

### `ignoredReturnFunctionNames`

Function or method names whose disposable return value should be treated as
borrowed, or as owned by a registration or session API. Names given here are
**added** to the defaults, which include `get`, `find`, `addCommand`, `open`, `register`, `set` and `transform`.

This is especially useful with `checkAllDisposableReturns`, which also checks APIs that may return borrowed objects or registration handles. A return type alone does not tell the rule who owns the object. See the full [default ignored-return list](https://github.com/jupyterlab/eslint-plugin/blob/main/src/rules/require-disposable-transfer.ts).

### `extendDefaultIgnoredReturnFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default ignore list instead of extending it. This
also drops the two pattern-based default exemptions, `add*Factory` and
`this._map.set(...)` / `this._map.delete(...)`, since those are part of the same
defaults. With no `ignoredReturnFunctionNames` of your own, `false` ignores
nothing at all.

### `checkAllDisposableReturns`

Type: `boolean`, default: `false`.

By default only factory-named calls (`create*`, `build*`, `make*`, `new*`) have
their disposable return value checked, because any call _might_ return a
disposable and reporting all of them is too noisy. Set this to `true` to check
every call whose return type is disposable.

Extending the defaults, the common case:

```json
{
  "jupyter/require-disposable-transfer": [
    "warn",
    {
      "ownershipFunctionNames": ["ownDisposable", "registerDisposable"],
      "ignoredReturnFunctionNames": ["borrowWidget"]
    }
  ]
}
```

Strictest possible checking, dropping every default exemption:

```json
{
  "jupyter/require-disposable-transfer": [
    "warn",
    {
      "extendDefaultOwnershipFunctionNames": false,
      "extendDefaultIgnoredReturnFunctionNames": false,
      "checkAllDisposableReturns": true
    }
  ]
}
```

<details>
<summary>Other recognized ownership patterns</summary>

With type information, passing a disposable to a parameter declared as a disposable type counts as a handoff, including through an options object. Configured ownership helper names work without that type information.

Other accepted patterns include:

- Assigning the resource to an object field or a class field initializer.
- Storing it in a class-field collection, such as `this._items.set(key, resource)`.
- Passing it as a direct array item to `DisposableSet.from()` or `ObservableDisposableSet.from()`.
- Exporting a binding, including inside an exported namespace. Reassigning an export does not preserve ownership of the previous value.
- Disposing it unconditionally inside a callback, for example `requestAnimationFrame(() => resource.dispose())`. A conditional disposal inside that callback is still reported.

A local variable can be handed off later, including through an options object or array. The plugin-activation exemption also covers a function named `activate` and a separate function referenced by the plugin's `activate` property.

These patterns establish an owner; they do not guarantee that the owner eventually disposes the resource.

</details>
