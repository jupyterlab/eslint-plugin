# `command-described-by`

Ensure JupyterLab command registrations include a `describedBy` property.

## Examples

### Describe a command argument

The `value` argument needs metadata that describes the value a caller should pass.

**Incorrect**

```ts
app.commands.addCommand(CommandIDs.test, {
  label: 'Test Command',
  execute: args => {
    console.log(args.value);
  }
});
```

**Correct**

```ts
app.commands.addCommand(CommandIDs.test, {
  label: 'Test Command',
  execute: args => {
    console.log(args.value);
  },
  describedBy: {
    args: {
      type: 'object',
      properties: {
        value: { type: 'string' }
      }
    }
  }
});
```

## Why

Commands are a fundamental building block in Jupyter frontend applications. They define actions reused by menus, shortcuts and the command palette. Commands are also reused by extension authors and AI integrations alike.

Adding a description of the arguments helps extension authors develop better integrations and LLMs call the command with the right shape of arguments. Certain LLM extensions map commands to tool calls 1:1.

The schema-based argument description is also used programmatically in JupyterLab and extensions:

- in the Keyboard Shortcuts UI, allowing users to tweak the action invoked on a shortcut press
- in the ui-profiler extension
- in plugin-playground

## Options

This rule has no options.
