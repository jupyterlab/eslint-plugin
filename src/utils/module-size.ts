/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as fs from 'fs';
import * as path from 'path';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Stops a pathological import graph from dominating lint time. */
const MAX_FILES = 300;
const MAX_DEPTH = 12;

interface FileInfo {
  mtimeMs: number;
  /** Bytes of code left once comments and type declarations are removed. */
  size: number;
  /** Resolved paths of the statically imported relative modules. */
  dependencies: string[];
}

const fileCache = new Map<string, FileInfo | null>();

/**
 * Resolves a relative import specifier to a file, trying the usual extensions
 * and an `index` file inside a directory. Returns null for a bare package
 * specifier, or when nothing matches.
 */
export function resolveRelativeModule(
  specifier: string,
  fromFile: string
): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...EXTENSIONS.map(extension => base + extension),
    ...EXTENSIONS.map(extension => path.join(base, `index${extension}`))
  ];
  for (const candidate of candidates) {
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return isFile(base) ? base : null;
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/**
 * Removes comments, leaving string and template literals untouched so that a
 * `//` inside a URL is not mistaken for one.
 */
function stripComments(source: string): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
    } else if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end;
    } else if (char === '"' || char === "'" || char === '`') {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2;
          continue;
        }
        if (source[end] === char) {
          break;
        }
        end += 1;
      }
      out += source.slice(index, end + 1);
      index = end + 1;
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
}

const TYPE_DECLARATION =
  /\b(?:export\s+)?(?:declare\s+)?(interface\s+\w|type\s+\w[\w\s,<>]*=)|\b(?:import|export)\s+type\s/g;

/**
 * Removes interface bodies, type aliases and type-only imports, which
 * TypeScript erases and which therefore add nothing to the bundle.
 */
function stripTypeDeclarations(source: string): string {
  let out = '';
  let index = 0;
  TYPE_DECLARATION.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TYPE_DECLARATION.exec(source)) !== null) {
    if (match.index < index) {
      continue;
    }
    out += source.slice(index, match.index);
    index = skipDeclaration(source, match);
    TYPE_DECLARATION.lastIndex = index;
  }
  return out + source.slice(index);
}

/**
 * Returns the offset just past the declaration which `match` starts.
 */
function skipDeclaration(source: string, match: RegExpExecArray): number {
  let index = match.index + match[0].length;
  const isInterface = match[1]?.startsWith('interface');

  if (isInterface) {
    while (index < source.length && source[index] !== '{') {
      index += 1;
    }
    let depth = 0;
    while (index < source.length) {
      if (source[index] === '{') {
        depth += 1;
      } else if (source[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }
      index += 1;
    }
    return index;
  }

  // A type alias or a type-only import ends at the first `;` or line break
  // which is not nested inside brackets.
  let depth = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '{' || char === '(' || char === '[' || char === '<') {
      depth += 1;
    } else if (char === '}' || char === ')' || char === ']' || char === '>') {
      depth -= 1;
    } else if (depth <= 0 && (char === ';' || char === '\n')) {
      return char === ';' ? index + 1 : index;
    }
    index += 1;
  }
  return index;
}

const STATIC_IMPORT =
  /(?:^|\n)\s*(?:import|export)\s+(?![\s]*type\s)(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;

/**
 * Reads a file and records the size of its code and the relative modules it
 * imports. Cached until the file changes on disk.
 */
function readFileInfo(filePath: string): FileInfo | null {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return null;
  }
  const mtimeMs = stats.mtimeMs;

  const cached = fileCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached;
  }

  // An asset inlined into the bundle, such as an SVG or a raw stylesheet,
  // contributes its bytes as they are and imports nothing.
  if (!EXTENSIONS.includes(path.extname(filePath))) {
    const info: FileInfo = { mtimeMs, size: stats.size, dependencies: [] };
    fileCache.set(filePath, info);
    return info;
  }

  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    fileCache.set(filePath, null);
    return null;
  }

  const code = stripTypeDeclarations(stripComments(source));
  const dependencies: string[] = [];
  STATIC_IMPORT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STATIC_IMPORT.exec(code)) !== null) {
    const resolved = resolveRelativeModule(match[1], filePath);
    if (resolved) {
      dependencies.push(resolved);
    }
  }

  const info: FileInfo = {
    mtimeMs,
    size: Buffer.byteLength(code.replace(/\s+/g, ' ').trim(), 'utf8'),
    dependencies
  };
  fileCache.set(filePath, info);
  return info;
}

/**
 * Sums the code size of a module and of every relative module it statically
 * imports. Dynamic imports are left out because they are already deferred.
 * Returns null when the file cannot be read.
 */
export function getTransitiveCodeSize(entry: string): number | null {
  const root = readFileInfo(entry);
  if (!root) {
    return null;
  }

  const seen = new Set<string>([entry]);
  const queue: Array<{ file: string; depth: number }> = [
    { file: entry, depth: 0 }
  ];
  let total = 0;

  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;
    const info = readFileInfo(file);
    if (!info) {
      continue;
    }
    total += info.size;
    if (depth >= MAX_DEPTH || seen.size >= MAX_FILES) {
      continue;
    }
    for (const dependency of info.dependencies) {
      if (!seen.has(dependency)) {
        seen.add(dependency);
        queue.push({ file: dependency, depth: depth + 1 });
      }
    }
  }
  return total;
}
