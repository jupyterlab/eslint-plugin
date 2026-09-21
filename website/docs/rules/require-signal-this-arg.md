# `require-signal-this-arg`

Require a `thisArg` when connecting a class method that references `this` to a Lumino signal.

## Examples

### Connect a method that uses the instance

`_onChanged()` calls `this.update()`, so it needs the view as its receiver.

**Incorrect**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(this._onChanged);
  }

  private _onChanged(): void {
    this.update();
  }
}
```

**Correct**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(this._onChanged, this);
  }

  private _onChanged(): void {
    this.update();
  }
}
```

### Connect a function stored in a field

A regular function stored in a class field does not capture `this` as an arrow function would.

**Incorrect**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(this._onChanged);
  }

  private _onChanged = function (this: NotebookView): void {
    this.update();
  };
}
```

**Correct**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(this._onChanged, this);
  }

  private _onChanged = function (this: NotebookView): void {
    this.update();
  };
}
```

### Use an arrow callback

The arrow captures `this` for execution. The second argument still registers a receiver so `Widget.dispose()` can clean up.

**Allowed**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(() => this.update(), this);
  }
}
```

### Use an arrow-function field

An arrow-function field also captures the instance. Without the second argument there is no unbound-method error, but [prefer-signal-this-arg](../prefer-signal-this-arg) can still report a cleanup problem.

**Allowed**

```ts
class NotebookView extends Widget {
  constructor(model: INotebookModel) {
    super();
    model.contentChanged.connect(this._onChanged, this);
  }

  private _onChanged = (): void => {
    this.update();
  };
}
```

## Why

Passing a class method to `connect()` does not bind it to the instance. If that method uses `this`, it can throw or read the wrong object when the signal fires. Passing `this` as the second argument gives it the intended receiver.

Arrow functions already capture `this`, but a receiver can still help with cleanup; see [prefer-signal-this-arg](../prefer-signal-this-arg) and the [JupyterLab signal patterns](https://jupyterlab.readthedocs.io/en/latest/developer/patterns.html#signals).

## Options

This rule has no options.

## Fixing a report

The editor suggestion adds `this` as the second argument. Review the change: if you also call `signal.disconnect(this._onChanged)`, update it to `signal.disconnect(this._onChanged, this)` so it still matches the connection. This is a suggestion rather than an automatic fix.

<details>
<summary>Scope and limitations</summary>

The rule checks class methods that use `this` and are passed to `connect()` without a second argument. It skips arrow-function properties, methods that do not use `this`, accessors and methods it cannot find in the enclosing class.

Calls inside nested regular functions are skipped because their `this` may refer to another object. When type information is available, APIs known not to be Lumino signals are ignored.

</details>
