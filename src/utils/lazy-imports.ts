/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { TSESLint } from '@typescript-eslint/utils';

/*
 * The defaults below assume the build JupyterLab extensions normally use:
 * rspack driven by `@jupyter/builder`, with Module Federation sharing packages
 * between the application and the extensions it loads. Webpack behaves the same
 * way here. A different bundler classifies assets differently, and a different
 * application shares a different set of packages, so `allowedPackages` and
 * `minimumSize` are both configurable.
 */

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export interface LazyImportOptions {
  allowedPackages: string[];
  ignoreImports: string[];
  minimumSize: number;
  reportModuleLevelUsage: boolean;
}

/**
 * An async chunk carries a few hundred bytes of bundler runtime, so around one
 * kilobyte of code the saving cancels out. The default sits well above that
 * break-even point: across the Jupyter extensions this rule was measured on,
 * four kilobytes reports half as many imports as one kilobyte while still
 * covering 96% of the code which could be deferred.
 */
export const DEFAULT_MINIMUM_SIZE = 4096;

/**
 * Packages shared through Module Federation, which the application therefore
 * loads whether or not a plugin module imports them at the top.
 *
 * This is the singleton list from `jupyterlab/staging/package.json`, minus
 * `@lumino/datagrid` which core itself defers (see `packages/csvviewer`).
 * Entries prefixed with `!` are denied even when another pattern allows them.
 */
export const DEFAULT_ALLOWED_PACKAGES = [
  '@jupyterlab/*',
  '@lumino/*',
  '!@lumino/datagrid',
  '@jupyter/ydoc',
  '@jupyter/react-components',
  '@jupyter/web-components',
  '@codemirror/language',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@microsoft/fast-element',
  '@microsoft/fast-foundation',
  'react',
  'react-dom',
  'yjs'
];

/**
 * Assets which a bundler turns into a URL or a style side effect rather than
 * into bundled bytes, so deferring the import saves nothing.
 *
 * Images and fonts are `asset/resource` in the builder configuration, so they
 * are always emitted as separate files and the browser fetches them only when
 * they are used. A stylesheet goes through `style-loader`, which applies it
 * when it is imported, so deferring it would change when the styles take
 * effect rather than only what is downloaded.
 *
 * Assets which are inlined into the bundle as text are deliberately absent:
 * `.svg` imported from JavaScript, `.raw.css`, `.md`, `.txt` and `.json` all
 * add their full size to the startup chunk, so they are measured like any
 * other module.
 */
export const ALWAYS_IGNORED_IMPORTS = [
  '*.css',
  // A raw stylesheet is inlined as text, not applied as a style.
  '!*.raw.css',
  '*.scss',
  '*.sass',
  '*.less',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.webp',
  '*.ico',
  '*.avif',
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
  '*.otf',
  '*.wasm',
  '*.html'
];

/**
 * Array and iterable methods which call their callback right away, so a
 * reference inside such a callback still runs at module load.
 */
const IMMEDIATE_CALLBACK_METHODS = new Set([
  'map',
  'forEach',
  'filter',
  'reduce',
  'reduceRight',
  'some',
  'every',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'flatMap',
  'sort'
]);

const globCache = new Map<string, RegExp>();

/**
 * Compiles a pattern where `*` matches any run of characters. Everything else
 * is matched literally.
 */
function compileGlob(pattern: string): RegExp {
  let regexp = globCache.get(pattern);
  if (!regexp) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
    regexp = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
    globCache.set(pattern, regexp);
  }
  return regexp;
}

/**
 * Extracts the package name from an import specifier, or null for a relative
 * or absolute path. Subpath imports resolve to their owning package, so
 * `@jupyterlab/services/lib/kernel` gives `@jupyterlab/services`.
 */
export function getPackageName(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return null;
  }
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] || null;
}

/**
 * Matches an import specifier against a list of glob patterns. The specifier is
 * tested both as written and as its owning package name. A matching `!` pattern
 * denies the specifier regardless of any other match.
 */
export function matchesPatterns(
  specifier: string,
  patterns: string[]
): boolean {
  const packageName = getPackageName(specifier);
  const candidates =
    packageName && packageName !== specifier
      ? [specifier, packageName]
      : [specifier];

  let allowed = false;
  for (const pattern of patterns) {
    const denied = pattern.startsWith('!');
    const regexp = compileGlob(denied ? pattern.slice(1) : pattern);
    if (candidates.some(candidate => regexp.test(candidate))) {
      if (denied) {
        return false;
      }
      allowed = true;
    }
  }
  return allowed;
}

/**
 * Returns true when the function is called right away where it appears, so its
 * body runs at module load rather than later.
 */
function isImmediatelyInvoked(fn: FunctionNode): boolean {
  const parent = fn.parent;
  if (!parent) {
    return false;
  }
  if (
    (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
    parent.callee === fn
  ) {
    return true;
  }
  // `list.map(x => Heavy(x))` and friends run the callback straight away.
  if (
    parent.type === 'CallExpression' &&
    parent.arguments.includes(fn as TSESTree.CallExpressionArgument) &&
    parent.callee.type === 'MemberExpression' &&
    !parent.callee.computed &&
    parent.callee.property.type === 'Identifier' &&
    IMMEDIATE_CALLBACK_METHODS.has(parent.callee.property.name)
  ) {
    return true;
  }
  return false;
}

/**
 * Finds the innermost construct which delays the node until after module
 * evaluation: a function which is not called on the spot, or an instance field
 * initializer which waits for construction. Returns null when the node runs
 * while the module is evaluated.
 */
function findDeferringBoundary(
  node: TSESTree.Node
): FunctionNode | 'field' | null {
  let child: TSESTree.Node | undefined = undefined;
  let current: TSESTree.Node | undefined = node;

  while (current) {
    switch (current.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        if (!isImmediatelyInvoked(current)) {
          return current;
        }
        break;
      case 'PropertyDefinition':
      case 'AccessorProperty':
        // An instance field initializer runs on construction; a static one runs
        // when the class is defined, which is at module load.
        if (!current.static && child === current.value) {
          return 'field';
        }
        break;
      case 'Program':
        return null;
    }
    child = current;
    current = current.parent;
  }
  return null;
}

/**
 * Returns the variable holding a function, for a declaration such as
 * `function run() {}` or `const run = () => {}`. Returns null for a function
 * which is never bound to a name, such as a callback or an object property.
 */
function getFunctionVariable(
  fn: FunctionNode,
  sourceCode: TSESLint.SourceCode
): TSESLint.Scope.Variable | null {
  if (fn.type === 'FunctionDeclaration' && fn.id) {
    return sourceCode.getDeclaredVariables(fn)[0] ?? null;
  }
  const parent = fn.parent;
  if (
    parent?.type === 'VariableDeclarator' &&
    parent.init === fn &&
    parent.id.type === 'Identifier'
  ) {
    return sourceCode.getDeclaredVariables(parent)[0] ?? null;
  }
  return null;
}

const MAX_CALL_DEPTH = 6;

/**
 * Returns true when the node runs while the module is evaluated, either
 * directly or through a named function which is called at module level.
 */
export function isEagerlyReached(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<TSESTree.Node> = new Set(),
  depth = 0
): boolean {
  const boundary = findDeferringBoundary(node);
  if (boundary === null) {
    return true;
  }
  if (boundary === 'field' || depth >= MAX_CALL_DEPTH || seen.has(boundary)) {
    return false;
  }
  seen.add(boundary);

  const variable = getFunctionVariable(boundary, sourceCode);
  if (!variable) {
    return false;
  }
  return variable.references.some(reference => {
    const identifier = reference.identifier;
    const parent = identifier.parent;
    // Only a call reaches the body; passing the function elsewhere does not
    // say when, or whether, it runs.
    if (parent?.type !== 'CallExpression' || parent.callee !== identifier) {
      return false;
    }
    return isEagerlyReached(identifier, sourceCode, seen, depth + 1);
  });
}

const PLUGIN_LIST_PROPERTIES = new Set(['requires', 'optional', 'provides']);

/**
 * Returns true when the node sits in a plugin's `requires`, `optional` or
 * `provides` entry, where a token has to be referenced at module load.
 */
export function isInPluginTokenList(node: TSESTree.Node): boolean {
  let child: TSESTree.Node | undefined = undefined;
  let current: TSESTree.Node | undefined = node;

  while (current) {
    if (
      current.type === 'Property' &&
      !current.computed &&
      child === current.value
    ) {
      const key = current.key;
      const name =
        key.type === 'Identifier'
          ? key.name
          : key.type === 'Literal' && typeof key.value === 'string'
            ? key.value
            : null;
      if (name && PLUGIN_LIST_PROPERTIES.has(name)) {
        return true;
      }
    }
    if (current.type === 'Program') {
      return false;
    }
    child = current;
    current = current.parent;
  }
  return false;
}

/**
 * Builds the deferred import snippet suggested in the report message, merging
 * every declaration which imports the same source.
 */
export function buildDeferredImportSnippet(
  declarations: TSESTree.ImportDeclaration[]
): string {
  const source = declarations[0].source.value;
  const named: string[] = [];
  let defaultName: string | null = null;
  let namespaceName: string | null = null;

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        if (specifier.importKind === 'type') {
          continue;
        }
        const imported =
          specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : String(specifier.imported.value);
        const entry =
          imported === specifier.local.name
            ? imported
            : `${imported}: ${specifier.local.name}`;
        if (!named.includes(entry)) {
          named.push(entry);
        }
      } else if (specifier.type === 'ImportDefaultSpecifier') {
        defaultName = specifier.local.name;
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        namespaceName = specifier.local.name;
      }
    }
  }

  if (namespaceName) {
    return `const ${namespaceName} = await import('${source}');`;
  }
  if (defaultName) {
    named.unshift(`default: ${defaultName}`);
  }
  if (named.length === 0) {
    return `await import('${source}');`;
  }
  return `const { ${named.join(', ')} } = await import('${source}');`;
}
