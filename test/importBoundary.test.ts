/**
 * Import-boundary enforcement — the experimental quarantine, proven mechanically.
 *
 * Every reviewed peer-free, host-agnostic source root must NOT import React, Three, R3F,
 * D3, a filesystem-only browser hazard, or anything under `experimental/`. If one did,
 * a server that only wanted to validate or prepare data would drag a rendering stack (or
 * a GPU peer) in behind it. This dependency classification does not confer stable-contract
 * status on the experimental peer-free knowledge-graph entry.
 *
 * This is checked by STATIC scan of the source graph rather than by importing, so it holds
 * even for a module that only conditionally reaches a forbidden import.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '../src');
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');

/** Every .ts/.tsx file under a directory. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Static literal import/re-export specifiers a TypeScript source file uses. */
function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers = new Set<string>();
  const importRe = /(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/g;
  const bareImportRe = /\bimport\s*['"]([^'"]+)['"]/g;
  const dynamicRe = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const re of [importRe, bareImportRe, dynamicRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

/** Bare import specifiers a file uses (the module names, not relative paths). */
function importedModules(file: string): string[] {
  return importSpecifiers(file).filter((specifier) =>
    !specifier.startsWith('.') && !specifier.startsWith('/'));
}

const REVIEWED_TYPESCRIPT_ROOTS = [
  path.join(REPOSITORY_ROOT, 'src'),
  path.join(REPOSITORY_ROOT, 'core'),
  path.join(REPOSITORY_ROOT, 'react'),
];

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveRelativeTypescriptImport(fromFile: string, specifier: string): string {
  const absolute = path.resolve(path.dirname(fromFile), specifier);
  const extension = path.extname(absolute);
  const stem = ['.js', '.jsx', '.mjs', '.cjs'].includes(extension)
    ? absolute.slice(0, -extension.length)
    : absolute;
  const candidates = [
    absolute,
    `${stem}.ts`,
    `${stem}.tsx`,
    path.join(absolute, 'index.ts'),
    path.join(absolute, 'index.tsx'),
  ];
  const resolved = candidates.find((candidate) =>
    existsSync(candidate) && statSync(candidate).isFile());
  if (resolved === undefined) {
    throw new Error(
      `cannot resolve relative TypeScript import ${JSON.stringify(specifier)} from ` +
      path.relative(REPOSITORY_ROOT, fromFile),
    );
  }
  if (!REVIEWED_TYPESCRIPT_ROOTS.some((root) => isWithin(root, resolved))) {
    throw new Error(
      `peer-free source closure escaped reviewed roots: ${
        path.relative(REPOSITORY_ROOT, resolved)
      }`,
    );
  }
  return resolved;
}

/** Bounded DFS over the exact relative source closure of one public entrypoint. */
function relativeSourceClosure(entrypoint: string): string[] {
  const pending = [entrypoint];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    if (visited.size > 1_000) {
      throw new Error('peer-free source closure exceeded its reviewed 1,000-file bound');
    }
    for (const specifier of importSpecifiers(file)) {
      if (specifier.startsWith('.')) {
        pending.push(resolveRelativeTypescriptImport(file, specifier));
      } else if (specifier.startsWith('/')) {
        throw new Error(
          `peer-free source closure contains an absolute import in ${
            path.relative(REPOSITORY_ROOT, file)
          }`,
        );
      }
    }
  }
  return [...visited].sort();
}

const FORBIDDEN_IN_PEER_FREE = [
  'react',
  'react-dom',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'd3-force-3d',
  'd3',
];

// Reviewed peer-free, host-agnostic roots. `src/react` and `src/experimental` are
// deliberately excluded because they MAY use visualization peers. Membership here is
// not a stability or scientific-evidence designation.
const PEER_FREE_HOST_AGNOSTIC_DIRS = [
  'core',
  'analysis',
  'render',
  'cli',
  'generated',
  'contract',
  'knowledge-graph',
].map((d) =>
  path.join(SRC, d),
);

describe('peer-free host-agnostic sources do not import optional peers', () => {
  const peerFreeFiles = PEER_FREE_HOST_AGNOSTIC_DIRS.flatMap((dir) => {
    try {
      return walk(dir);
    } catch {
      return [];
    }
  });

  it('finds the reviewed peer-free source files', () => {
    expect(peerFreeFiles.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN_IN_PEER_FREE)('no reviewed peer-free file imports "%s"', (forbidden) => {
    const offenders = peerFreeFiles.filter((file) =>
      importedModules(file).some((m) => m === forbidden || m.startsWith(`${forbidden}/`)),
    );
    expect(
      offenders.map((f) => path.relative(SRC, f)),
      `${forbidden} is imported by a reviewed peer-free source`,
    ).toEqual([]);
  });

  it('no reviewed peer-free file imports anything under experimental/', () => {
    const offenders = peerFreeFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /['"][^'"]*experimental\//.test(source);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('the browser-safe render layer imports no Node-only module that a browser lacks', () => {
    // The render layer must stay browser-safe: it may compute a figure in a browser.
    // (The CLI is the Node surface and is exempt.)
    const renderFiles = walk(path.join(SRC, 'render'));
    const nodeOnly = ['node:fs', 'node:child_process', 'node:net', 'node:http', 'fs', 'child_process'];
    const offenders = renderFiles.filter((file) =>
      importedModules(file).some((m) => nodeOnly.includes(m)),
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('the peer-free knowledge-graph entry has no forbidden peer in its full source closure', () => {
    const entrypoint = path.join(SRC, 'knowledge-graph/index.ts');
    const closure = relativeSourceClosure(entrypoint);
    expect(closure.length).toBeGreaterThan(8);
    const offenders = closure.flatMap((file) =>
      importedModules(file)
        .filter((module) => FORBIDDEN_IN_PEER_FREE.some((forbidden) =>
          module === forbidden || module.startsWith(`${forbidden}/`)))
        .map((module) => ({ file: path.relative(REPOSITORY_ROOT, file), module })),
    );
    expect(offenders).toEqual([]);
  });

  it('the peer-free knowledge-graph closure has no Node or network runtime import', () => {
    const entrypoint = path.join(SRC, 'knowledge-graph/index.ts');
    const closure = relativeSourceClosure(entrypoint);
    const nodeBuiltins = new Set([
      ...builtinModules,
      ...builtinModules.map((module) => `node:${module}`),
    ]);
    const networkPackages = new Set([
      'axios',
      'cross-fetch',
      'got',
      'isomorphic-fetch',
      'isomorphic-ws',
      'node-fetch',
      'undici',
      'whatwg-fetch',
      'ws',
    ]);
    const offenders = closure.flatMap((file) =>
      importedModules(file)
        .filter((module) => {
          const packageRoot = module.startsWith('@')
            ? module.split('/').slice(0, 2).join('/')
            : module.split('/')[0];
          return nodeBuiltins.has(module) || networkPackages.has(packageRoot);
        })
        .map((module) => ({ file: path.relative(REPOSITORY_ROOT, file), module })),
    );
    expect(offenders).toEqual([]);
  });
});
