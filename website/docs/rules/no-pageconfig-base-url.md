# `no-pageconfig-base-url`

Disallow calling `PageConfig.getBaseUrl()` outside of `makeSettings()`.

## Why

JupyterLab supports swapping the backend URL at runtime via a custom `ServiceManagerPlugin<ServerConnection.ISettings>`. This only works when code retrieves `baseUrl` fresh from a stored `ServerConnection.ISettings` object each time it is needed, rather than capturing it once at construction time.

Calling `PageConfig.getBaseUrl()` directly bypasses `ServerConnection.ISettings` entirely, making the backend URL effectively immutable for the lifetime of the object, especially when memoizing the URL in a field.

## Rule details

The rule reports every call expression of the form `PageConfig.getBaseUrl()`. The only legitimate call site is inside the `ServerConnection.makeSettings()` implementation itself, and in tests or examples.

## Incorrect

```ts
// Stored on instance — URL can never change after construction
constructor(options: IOptions) {
  this._baseUrl = PageConfig.getBaseUrl();
}

// Captured in a closure at activation time
activate: (app: JupyterFrontEnd, paths: JupyterFrontEnd.IPaths) => {
  const url = URLExt.join(PageConfig.getBaseUrl(), paths.urls.themes);
  return new ThemeManager({ url });
};
```

## Correct

```ts
// Access baseUrl from stored settings each time it is needed
private async _requestAPI<T>(): Promise<T> {
  const settings = this._serverSettings;
  const requestUrl = URLExt.join(settings.baseUrl, API_PATH);
  const response = await ServerConnection.makeRequest(requestUrl, {}, settings);
  ...
}

// Pass serverSettings through and read baseUrl when needed
activate: (app: JupyterFrontEnd) => {
  const serverSettings = app.serviceManager.serverSettings;
  return new MyManager({ serverSettings });
};
```

## Options

This rule has no options.
