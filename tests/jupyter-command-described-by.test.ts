/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as path from 'path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import commandDescribedBy from '../src/rules/command-described-by';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

const typeAwareTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['tests/*.ts'],
        defaultProject: 'tsconfig.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

ruleTester.run('command-described-by', commandDescribedBy, {
  valid: [
    {
      code: `
                app.commands.addCommand(CommandIDs.noArgsTest, {
                    label: 'Simple Test',
                    execute: () => {
                        console.log('test');
                    },
                    'describedBy': {
                        args: {
                            type: 'object',
                            properties: {}
                        }
                    }
                });
            `
    },
    {
      code: `
                test.addCommand('test:execute', {
                    label: 'Test Execute',
                    execute: (args) => {
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
            `
    },
    {
      code: `
                const commandId = 'test:execute';
                test.addCommand(commandId, {
                    label: 'Test Execute',
                    execute: (args) => {
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
            `
    },
    {
      code: `
                test.addCommand('test:execute',
                  (args) => {
                      console.log(args.value);
                  }
                );
            `
    },
    {
      code: `
                test.addCommand({
                    random_1: 'Test Execute',
                    random_2: (args) => {
                        console.log(args.value);
                    }
                });
            `
    },
    {
      // A throw-away registry backing a menu is not exposed to the application.
      code: `
        const commands = new CommandRegistry();
        const menu = new Menu({ commands });
        commands.addCommand('open-console', {
          execute: () => {}
        });
      `
    },
    {
      code: `
        let commands;
        commands = new CommandRegistry();
        commands.addCommand('open-console', {
          execute: () => {}
        });
      `
    },
    {
      code: `
        class MainView {
          private _commands: CommandRegistry;
          constructor() {
            this._commands = new CommandRegistry();
            this._contextMenu = new ContextMenu({ commands: this._commands });
          }
          private _setupMenu(): void {
            this._commands.addCommand('Copy-Coordinates', {
              execute: () => {}
            });
          }
        }
      `
    },
    {
      // An arrow function keeps the class instance as \`this\`.
      code: `
        class MainView {
          private _commands = new CommandRegistry();
          private _setupMenu = () => {
            this._commands.addCommand('copy', {
              execute: () => {}
            });
          };
        }
      `
    },
    {
      code: `
        class MainView {
          #commands = new CommandRegistry();
          setup() {
            this.#commands.addCommand('copy', {
              execute: () => {}
            });
          }
        }
      `
    },
    {
      code: `
        import { CommandRegistry as Registry } from '@lumino/commands';
        const commands = new Registry();
        commands.addCommand('copy', {
          execute: () => {}
        });
      `
    },
    {
      code: `
        import * as lumino from '@lumino/commands';
        const commands = new lumino.CommandRegistry();
        commands.addCommand('copy', {
          execute: () => {}
        });
      `
    }
  ],

  invalid: [
    {
      code: `
                app.commands.addCommand(CommandIDs.test, {
                    label: 'Test Command',
                    execute: (args) => {
                        console.log(args.value);
                    }
                });
            `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'test' }
        }
      ]
    },
    {
      code: `
                test.addCommand(CommandIDs.test, {
                    label: 'Test Command',
                    execute: () => {
                        console.log('test');
                    }
                });
            `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'test' }
        }
      ]
    },
    {
      code: `
        namespace CommandIDs {
          export const open = 'my-extension:open';
        }
        app.commands.addCommand(CommandIDs.open, {
          label: 'Open',
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'my-extension:open' }
        }
      ]
    },
    {
      code: `
        const CommandIDs = {
          open: 'my-extension:open'
        } as const;
        app.commands.addCommand(CommandIDs.open, {
          label: 'Open',
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'my-extension:open' }
        }
      ]
    },
    {
      code: `
        const NAMESPACE = 'my-extension';
        app.commands.addCommand(\`\${NAMESPACE}:open\`, {
          label: 'Open',
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'my-extension:open' }
        }
      ]
    }
  ]
});

typeAwareTester.run('command-described-by (type-aware)', commandDescribedBy, {
  valid: [
    {
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { CommandRegistry } from '@lumino/commands';
        const commands = new CommandRegistry();
        commands.addCommand('local:cmd', {
          execute: () => {}
        });
      `
    }
  ],
  invalid: [
    {
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { CommandRegistry } from '@lumino/commands';
        declare const appCommands: CommandRegistry;
        declare const CMD: 'app:open';
        appCommands.addCommand(CMD, {
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingDescribedBy',
          data: { commandId: 'app:open' }
        }
      ]
    }
  ]
});
