import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
        title: 'Getting Started'
      },
      items: [
        'getting-started/overview',
        'getting-started/installation',
        'getting-started/quickstart'
      ]
    },
    {
      type: 'category',
      label: 'Configuration',
      link: {
        type: 'generated-index',
        title: 'Configuration'
      },
      items: [
        'configuration/flat-config',
        'configuration/recommended-config',
        'configuration/rule-options'
      ]
    },
    {
      type: 'category',
      label: 'Reference',
      link: {
        type: 'generated-index',
        title: 'Reference'
      },
      items: [
        'reference/troubleshooting',
        'reference/architecture',
        'reference/contributing'
      ]
    },
    {
      type: 'category',
      label: 'Rules',
      link: {
        type: 'generated-index',
        title: 'Rules'
      },
      items: [
        'rules/index',
        'rules/command-described-by',
        'rules/plugin-activation-args',
        'rules/plugin-description'
      ]
    }
  ]
};

export default sidebars;
