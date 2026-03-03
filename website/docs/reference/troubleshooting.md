# Troubleshooting

## Rule is not firing

Check the following:

- ESLint flat config includes `plugins: { jupyter: jupyterPlugin }`
- Rule names use the `jupyter/` prefix
- File globs include plugin source files

## TypeScript files are ignored or misparsed

Use `@typescript-eslint/parser` in `languageOptions.parser` for `.ts` and `.tsx` files.

## `plugin-activation-args` seems too strict

This rule validates Jupyter plugin conventions for:

- First argument position and type
- `requires` / `optional` token ordering
- Argument count consistency

If your team uses a different first argument name convention, configure `allowedFirstArgumentNames`.
