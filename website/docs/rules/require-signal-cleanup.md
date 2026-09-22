# `require-signal-cleanup`

Disconnect from long-lived services when disposing the object that listens to them.

## Examples

### Clear connections during disposal

Setting a disposal flag does not unsubscribe the watcher. The registry can continue calling it until the connection is removed.

**Incorrect**

```ts
class SettingsWatcher implements IDisposable {
  constructor(registry: ISettingRegistry) {
    registry.pluginChanged.connect(this._onChanged, this);
  }

  isDisposed = false;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
  }

  private _onChanged(): void {
    refreshSettings();
  }
}
```

**Correct**

```ts
class SettingsWatcher implements IDisposable {
  constructor(registry: ISettingRegistry) {
    registry.pluginChanged.connect(this._onChanged, this);
  }

  isDisposed = false;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  private _onChanged(): void {
    refreshSettings();
  }
}
```

### Disconnect a specific callback

Keep the sender and pass the same callback and receiver to `disconnect()`.

**Incorrect**

```ts
class SettingsWatcher implements IDisposable {
  constructor(private _registry: ISettingRegistry) {
    this._registry.pluginChanged.connect(this._onChanged, this);
  }

  isDisposed = false;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
  }

  private _onChanged(): void {
    refreshSettings();
  }
}
```

**Correct**

```ts
class SettingsWatcher implements IDisposable {
  constructor(private _registry: ISettingRegistry) {
    this._registry.pluginChanged.connect(this._onChanged, this);
  }

  isDisposed = false;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._registry.pluginChanged.disconnect(this._onChanged, this);
  }

  private _onChanged(): void {
    refreshSettings();
  }
}
```

### Rely on Widget cleanup

`Widget.dispose()` already clears connections made with the widget as the receiver. If you override it, call `super.dispose()`.

**Allowed**

```ts
class SettingsPanel extends Widget {
  constructor(registry: ISettingRegistry) {
    super();
    registry.pluginChanged.connect(() => this.update(), this);
  }
}
```

### Dispose an owned sender

Here the host owns and disposes the editor, whose disposal cleans up its signals. The sender does not outlive the host.

**Allowed**

```ts
class Host implements IDisposable {
  constructor() {
    this._editor.ready.connect(() => refreshEditor(), this);
  }

  isDisposed = false;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._editor.dispose();
  }

  private _editor = createEditor();
}
```

## Why

A long-lived service can keep a discarded object alive through its signal connections. The callback may then keep running after the object is disposed. Clear its connections during disposal, or explicitly disconnect each callback with the same receiver used to connect it.

## Type-aware checking

:::info Requires type information

Enable [type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/) for this rule. Without it, the rule reports nothing.

:::

## Related rules

This rule checks connections made with `this` as the receiver. For connections without a receiver, see [require-signal-this-arg](../require-signal-this-arg) and [prefer-signal-this-arg](../prefer-signal-this-arg).

## Options

- `longLivedTypes` (`string[]`): type names treated as application-lifetime services. **Replaces** the built-in list when provided. The default is:

  `CommandRegistry`, `IDebugger`, `IDocumentManager`, `ILSPConnection`, `ILabShell`, `ILanguageServerManager`, `IRenderMimeRegistry`, `ISessionConnection`, `ISessionContext`, `ISettingRegistry`, `IShell`, `IStateDB`, `IThemeManager`, `ServiceManager`

- `additionalCleanupMethods` (`string[]`, default `[]`): additional method names (besides `disconnect`) that count as cleanup evidence when called anywhere in the class. Use this to allowlist project-specific teardown idioms.

```json
{
  "jupyter/require-signal-cleanup": [
    "warn",
    {
      "longLivedTypes": ["ISettingRegistry", "IMyAppService"],
      "additionalCleanupMethods": ["_stopObserving"]
    }
  ]
}
```

<details>
<summary>Scope and limitations</summary>

The rule checks disposable classes without a base class that connect to a known long-lived service. It skips owned senders, `disposed` signals, all subclasses (even if their base class does not clean up) and classes without a disposal protocol. Add your own service types with `longLivedTypes`.

Any signal cleanup call, `disconnect()` call or configured cleanup method in the class suppresses reports for the whole class. It does not verify that every connection is removed, or that the owner actually calls `dispose()`. Cleanup performed elsewhere is not visible.

</details>
