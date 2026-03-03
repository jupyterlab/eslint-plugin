# Architecture

## Plugin entrypoint

The plugin is exported from `src/index.ts` and contains:

- `rules`: individual lint rules
- `configs.recommended`: ready-to-use ruleset

## Rule design

Each rule is implemented as an ESLint `RuleModule` with:

- Metadata (`meta.docs`, `meta.messages`, `meta.schema`)
- AST listeners in `create(context)`
- Focused helper utilities under `src/utils`

## Current rule set

- `command-described-by`: enforces command metadata completeness
- `plugin-activation-args`: validates plugin activation signature against tokens
- `plugin-description`: enforces non-empty plugin descriptions
