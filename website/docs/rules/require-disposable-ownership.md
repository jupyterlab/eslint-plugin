# `require-disposable-ownership`

Require newly created disposable objects to be owned, returned, assigned to a
field, or disposed.

## Examples

### Return the resource to its caller

Returning the resource gives the caller responsibility for disposing it.

**Incorrect**

```ts
function createResource() {
  new DisposableDelegate(() => cleanup());
}
```

**Correct**

```ts
function createResource() {
  return new DisposableDelegate(() => cleanup());
}
```

### Give a resource to a disposable collection

A local variable keeps the value accessible only during construction. The collection keeps it until the owner is disposed.

**Incorrect**

```ts
class Owner {
  constructor() {
    const resource = new DisposableDelegate(() => cleanup());
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
    const resource = new DisposableDelegate(() => cleanup());
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
  const resource = new DisposableDelegate(() => cleanup());
  console.log(resource);
}
```

**Correct**

```ts
function finishTask() {
  const resource = new DisposableDelegate(() => cleanup());
  resource.dispose();
}
```

### Pass a resource to a typed owner

With type information, a disposable parameter in an options object counts as a handoff. The application helper `ownResource()` must actually take responsibility for disposal; logging the same object does not.

**Incorrect**

```ts
const resource = new DisposableDelegate(() => cleanup());
console.log({ resource });
```

**Correct**

```ts
declare function ownResource(options: { resource: IDisposable }): void;

const resource = new DisposableDelegate(() => cleanup());
ownResource({ resource });
```

### Return a cleanup closure

The returned function owns the captured resource. Its caller must invoke it when cleanup is needed.

**Allowed**

```ts
function createCleanup(): () => void {
  const resource = new DisposableDelegate(() => cleanup());
  return () => resource.dispose();
}
```

## Why

Lumino `IDisposable` objects represent lifecycle cleanup. Creating a disposable
and then dropping it usually leaks resources or callbacks that should have been
released later.

## Usage

The rule checks objects created with `new`. It recognizes Lumino's `DisposableDelegate`, `ObservableDisposableDelegate`, `DisposableSet` and `ObservableDisposableSet` without type information. Type-aware linting also recognizes other classes implementing `IDisposable` or `IObservableDisposable`.

Values created directly in a Jupyter plugin’s `activate()` function are exempt because they commonly live for the application lifetime. A reported value can be returned, assigned to a field, put in a disposable collection, passed to an ownership helper or disposed. Keeping it in a local variable without arranging cleanup is not enough.

## Options

### `ownershipFunctionNames`

Use this option for ownership helpers that the rule cannot recognize from their parameter types.

Function or method names that take ownership of disposable arguments, such as
`add`, `addWidget`, `insertWidget`, and `registerStatusItem`. For the full
default list see the
[`DEFAULT_OWNERSHIP_FUNCTION_NAMES`](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+const+DEFAULT_OWNERSHIP_FUNCTION_NAMES&type=code)
constant.

Names given here are **added** to that default list, so a project only has to
name its own ownership helpers:

```json
{
  "jupyter/require-disposable-ownership": [
    "warn",
    {
      "ownershipFunctionNames": ["ownDisposable", "registerDisposable"]
    }
  ]
}
```

### `extendDefaultOwnershipFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default list instead of extending it. With no
`ownershipFunctionNames` of your own, `false` drops the defaults entirely, which
is how to ask for the strictest typed ownership checking:

```json
{
  "jupyter/require-disposable-ownership": [
    "warn",
    { "extendDefaultOwnershipFunctionNames": false }
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
