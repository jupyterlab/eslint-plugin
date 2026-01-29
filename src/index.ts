import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
  },
  configs: {
    recommended: {
      files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
      plugins: {
        dp: {
          rules: {
            'plugin-activation-args': pluginActivationArgs,
            'command-described-by': commandDescribedBy,
            'plugin-description': pluginDescription,
          },
        },
      },
      rules: {
        'dp/plugin-activation-args': 'error',
        'dp/command-described-by': 'error',
        'dp/plugin-description': 'error',
      },
    },
  },
};

export = plugin;
