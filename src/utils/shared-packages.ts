/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as fs from 'fs';
import * as path from 'path';

/** How far to look upwards for the labextension manifest. */
const MAX_LEVELS = 12;

interface ManifestInfo {
  mtimeMs: number;
  /** Packages the host provides, so this extension does not bundle them. */
  hostProvided: string[];
}

const manifestCache = new Map<string, ManifestInfo | null>();
const directoryCache = new Map<string, string[]>();

/**
 * Reads the packages which `jupyterlab.sharedPackages` marks as provided by
 * the application rather than bundled here.
 *
 * `@jupyter/builder` turns `bundled: false` into `import: false`, which leaves
 * the package to the host at runtime. Anything else stays in this extension's
 * own bundle: `bundled: true`, an entry with no `bundled` key, and `false`,
 * which removes the package from the shared scope altogether.
 */
function readManifest(manifestPath: string): ManifestInfo | null {
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(manifestPath).mtimeMs;
  } catch {
    return null;
  }

  const cached = manifestCache.get(manifestPath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    manifestCache.set(manifestPath, null);
    return null;
  }

  const jupyterlab = data.jupyterlab as
    | { sharedPackages?: Record<string, unknown> }
    | undefined;
  if (!jupyterlab || typeof jupyterlab !== 'object') {
    // Not a labextension manifest, so keep looking further up.
    manifestCache.set(manifestPath, null);
    return null;
  }

  const shared = jupyterlab.sharedPackages ?? {};
  const hostProvided: string[] = [];
  for (const [name, entry] of Object.entries(shared)) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { bundled?: unknown }).bundled === false
    ) {
      hostProvided.push(name);
    }
  }

  const info: ManifestInfo = { mtimeMs, hostProvided };
  manifestCache.set(manifestPath, info);
  return info;
}

/**
 * Walks up from a linted file to its labextension manifest and returns the
 * packages the application provides at runtime. Importing one of those at the
 * top of a plugin module adds nothing to the extension's own bundle.
 *
 * Returns an empty list when no manifest declares any, which is the common
 * case outside a monorepo sharing packages between its extensions.
 */
export function getHostProvidedPackages(fromFile: string): string[] {
  let directory = path.dirname(path.resolve(fromFile));

  const cached = directoryCache.get(directory);
  if (cached) {
    return cached;
  }

  const visited: string[] = [];
  let result: string[] = [];
  for (let level = 0; level < MAX_LEVELS; level++) {
    visited.push(directory);
    const info = readManifest(path.join(directory, 'package.json'));
    if (info) {
      result = info.hostProvided;
      break;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }

  for (const seen of visited) {
    directoryCache.set(seen, result);
  }
  return result;
}
