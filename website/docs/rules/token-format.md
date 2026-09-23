# `token-format`

Use `<package>:<TokenSymbol>` for JupyterLab token IDs.

## Examples

### Use an identifier as the token symbol

A hyphen is not allowed in the symbol after `:`.

**Incorrect**

```ts
export const IFooService = new Token<IFooService>(
  '@test/pkg:foo-service',
  'A foo service'
);
```

**Correct**

```ts
export const IFooService = new Token<IFooService>(
  '@test/pkg:IFooService',
  'A foo service'
);
```

### Include the separator

**Incorrect**

```ts
new Token<IFooService>('IFooService', 'A foo service');
```

**Correct**

```ts
new Token<IFooService>('@test/pkg:IFooService', 'A foo service');
```

### Do not start the symbol with a digit

**Incorrect**

```ts
new Token<IVersion2Service>('@test/pkg:2Service', 'Version 2 service');
```

**Correct**

```ts
new Token<IVersion2Service>('@test/pkg:IVersion2Service', 'Version 2 service');
```

## Why

Including the package name and service symbol makes a token easy to identify.

## Options

This rule has no options.

<details>
<summary>Which token IDs are checked?</summary>

The rule checks string literals passed to `new Token(...)`. Variables and template literals are not checked.

The part after `:` must start with an ASCII letter, `_` or `$` and contain only those characters or digits. A missing `:` is also reported.

</details>
