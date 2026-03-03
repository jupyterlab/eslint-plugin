# Contributing

## Development workflow

From repository root:

```bash
npm install
npm run build
npm test
```

## Documentation workflow

```bash
npm run docs:start
```

## Add or change a rule

1. Implement rule logic under `src/rules`
2. Add tests under `tests`
3. Build and run tests
4. Add or update rule page under `website/docs/rules`

## Release notes

Use `CHANGELOG.md` for release summary updates.
