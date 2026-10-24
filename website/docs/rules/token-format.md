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

The rule checks the first argument of `new Token(...)`. The ID can be a
string literal or assembled from constant strings:

- a template literal, a `+` concatenation or a `const`;
- a member of a `const` object, or of a namespace or enum declared in the same
  file;
- with type information, anything whose type is a string literal type, such as
  a `const` imported from another module.

An ID the rule cannot resolve to a string, such as a function call whose return
type is plain `string`, is not checked.

The part after `:` must start with an ASCII letter, `_` or `$` and contain only
those characters or digits. A missing `:` is also reported.

</details>
