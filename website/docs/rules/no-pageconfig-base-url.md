# `no-pageconfig-base-url`

Disallow calling `PageConfig.getBaseUrl()` outside of `makeSettings()`.

## Examples

### Build a request URL from the current settings

Use the same server settings for the URL and the request.

**Incorrect**

```ts
function requestContents(serverSettings: ServerConnection.ISettings) {
  const url = URLExt.join(PageConfig.getBaseUrl(), 'api', 'contents');
  return ServerConnection.makeRequest(url, {}, serverSettings);
}
```

**Correct**

```ts
function requestContents(serverSettings: ServerConnection.ISettings) {
  const url = URLExt.join(serverSettings.baseUrl, 'api', 'contents');
  return ServerConnection.makeRequest(url, {}, serverSettings);
}
```

### Store settings instead of a URL captured during construction

Read `baseUrl` for each request. Caching `serverSettings.baseUrl` in the constructor would also prevent later changes from taking effect, although this rule only reports `PageConfig.getBaseUrl()` calls.

**Incorrect**

```ts
class ApiClient {
  constructor(serverSettings: ServerConnection.ISettings) {
    this._serverSettings = serverSettings;
    this._baseUrl = PageConfig.getBaseUrl();
  }

  request() {
    const url = URLExt.join(this._baseUrl, 'api', 'contents');
    return ServerConnection.makeRequest(url, {}, this._serverSettings);
  }

  private _baseUrl: string;
  private _serverSettings: ServerConnection.ISettings;
}
```

**Correct**

```ts
class ApiClient {
  constructor(private _serverSettings: ServerConnection.ISettings) {}

  request() {
    const url = URLExt.join(this._serverSettings.baseUrl, 'api', 'contents');
    return ServerConnection.makeRequest(url, {}, this._serverSettings);
  }
}
```

### Pass settings from plugin activation

The command uses `requestContents()` from the first example, so it reads the current URL whenever it runs.

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:requests',
  activate: (app: JupyterFrontEnd) => {
    const baseUrl = PageConfig.getBaseUrl();
    app.commands.addCommand('my-extension:request', {
      execute: () => fetch(URLExt.join(baseUrl, 'api', 'contents'))
    });
  }
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:requests',
  activate: (app: JupyterFrontEnd) => {
    const serverSettings = app.serviceManager.serverSettings;
    app.commands.addCommand('my-extension:request', {
      execute: () => requestContents(serverSettings)
    });
  }
};
```

## Why

JupyterLab can switch backend URLs at runtime. Reading `baseUrl` from the stored `ServerConnection.ISettings` each time allows requests to use the current backend. Calling `PageConfig.getBaseUrl()` or caching its result bypasses those settings.

## Exceptions

The rule reports every `PageConfig.getBaseUrl()` call. Disable it where that call is intentional, such as the implementation of `ServerConnection.makeSettings()`, or tests and examples of that API.

## Options

This rule has no options.
