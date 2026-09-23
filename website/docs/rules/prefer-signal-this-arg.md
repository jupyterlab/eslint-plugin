# `prefer-signal-this-arg`

Pass `this` when connecting a signal that can outlive the receiving object, so disposal can remove the connection.

## Examples

### Connect to an application service

The registry outlives the panel. Passing `this` lets `Widget.dispose()` remove the connection when the panel closes.

**Incorrect**

```ts
class SettingsPanel extends Widget {
  constructor(registry: ISettingRegistry) {
    super();
    registry.pluginChanged.connect(() => this.update());
  }
}
```

**Correct**

```ts
class SettingsPanel extends Widget {
  constructor(registry: ISettingRegistry) {
    super();
    registry.pluginChanged.connect(() => this.update(), this);
  }
}
```

### Connect a view to a shared model

A notebook model can outlive an individual view. Closing a view should stop its callbacks without disposing the shared model.

**Incorrect**

```ts
class NotebookView extends Widget {
  constructor(private _model: INotebookModel) {
    super();
    this._model.contentChanged.connect(() => this.update());
  }
}
```

**Correct**

```ts
class NotebookView extends Widget {
  constructor(private _model: INotebookModel) {
    super();
    this._model.contentChanged.connect(() => this.update(), this);
  }
}
```

### Replace a bound callback

Each `.bind(this)` call creates a new function. Connecting the method with a receiver lets inherited cleanup remove it.

**Incorrect**

```ts
class SourcesBody extends Widget {
  constructor(service: IDebugger) {
    super();
    service.model.currentFrameChanged.connect(this._onFrameChanged.bind(this));
  }

  private _onFrameChanged(): void {
    this.update();
  }
}
```

**Correct**

```ts
class SourcesBody extends Widget {
  constructor(service: IDebugger) {
    super();
    service.model.currentFrameChanged.connect(this._onFrameChanged, this);
  }

  private _onFrameChanged(): void {
    this.update();
  }
}
```

### Keep an existing matching disconnect

This callback already has a cleanup path. Adding `this` only to `connect()` would break the existing `disconnect()` match.

**Allowed**

```ts
class SettingsPanel extends Widget {
  constructor(registry: ISettingRegistry) {
    super();
    const update = () => this.update();
    registry.pluginChanged.connect(update);
    this.disposed.connect(() => {
      registry.pluginChanged.disconnect(update);
    });
  }
}
```

## Why

A settings registry lives longer than the panels that use it. Without a receiver, its signal keeps the callback connected after a panel is disposed. Passing `this` lets the inherited `Widget.dispose()` remove that connection.

A stale callback that references a widget can keep the entire widget and its resources in memory. Repeatedly opening and closing panels can accumulate these memory leaks and unwanted callbacks, increasing memory use and slowing the interface.

The same applies to a notebook model shared by multiple views: closing one view should remove its callbacks without disposing the model.

This rule covers cleanup. For unbound methods that fail when called, see [require-signal-this-arg](../require-signal-this-arg). The two rules do not report the same connection. Adding a receiver alone does not provide cleanup in a class that has none; see [require-signal-cleanup](../require-signal-cleanup).

## Type-aware checking

:::info Requires type information

Enable [type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/) for this rule. Without it, the rule reports nothing.

:::

## Fixing a report

The editor suggestion adds `this` to the connection. For `callback.bind(this)`, it also removes the bind. A callback bound to another object keeps that binding; the suggestion only adds the cleanup receiver. Review matching `disconnect()` calls before accepting: the callback and receiver must match the original connection.

A matching one-argument `disconnect(callback)` already provides cleanup and is left alone. Adding a receiver only to `connect()` would break that match.

## Options

- `longLivedTypes` (`string[]`): type names treated as application-lifetime services. **Replaces** the built-in list when provided. The default is:

  `CommandRegistry`, `IDebugger`, `IDocumentManager`, `ILSPConnection`, `ILabShell`, `ILanguageServerManager`, `IRenderMimeRegistry`, `ISessionConnection`, `ISessionContext`, `ISettingRegistry`, `IShell`, `IStateDB`, `IThemeManager`, `ServiceManager`

```json
{
  "jupyter/prefer-signal-this-arg": [
    "warn",
    { "longLivedTypes": ["ISettingRegistry", "IMyAppService"] }
  ]
}
```

<details>
<summary>Scope and limitations</summary>

The rule reports only when the sender is a known long-lived service, or a model used by a Lumino widget, and the receiving class already has receiver-based cleanup. Senders owned and disposed by that class, its own signals and `disposed` signals are left alone.

Receiver-based cleanup includes `Signal.clearData(this)`, `Signal.disconnectReceiver(this)`, `Signal.disconnectAll(this)`, `Signal.disconnectBetween(sender, this)`, or a matching `disconnect(callback, this)` in the class. Lumino widgets inherit cleanup from `Widget.dispose()`.

Calls in static members and nested regular functions are skipped because `this` does not identify the receiving instance there.

Unknown lifetimes are not reported. Add your own application services with `longLivedTypes`. The model/view check requires a Lumino widget; other view-like classes are not covered. Cleanup in another file cannot be detected.

</details>
