/**
 * Import-boundary enforcement — the experimental quarantine, proven mechanically.
 *
 * The stable core, the analysis layer, the render layer, and the CLI must NOT import
 * React, Three, R3F, D3, a filesystem-only browser hazard, or anything under
 * `experimental/`. If they did, a server that only wanted to validate a request would drag
 * a rendering stack (or a GPU peer) in behind it, and the "stable core is host-agnostic"
 * promise would be false.
 *
 * This is checked by STATIC scan of the source graph rather than by importing, so it holds
 * even for a module that only conditionally reaches a forbidden import.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '../src');

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

/** Bare import specifiers a file uses (the module names, not relative paths). */
function importedModules(file: string): string[] {
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
  // Keep only bare specifiers (external packages) — relative paths start with `.` or `/`.
  return [...specifiers].filter((s) => !s.startsWith('.') && !s.startsWith('/'));
}

const FORBIDDEN_IN_STABLE = [
  'react',
  'react-dom',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'd3-force-3d',
  'd3',
];

// The stable, host-agnostic layers. `src/react` and `src/experimental` are deliberately
// excluded — they are the surfaces that MAY use those peers.
const STABLE_DIRS = ['core', 'analysis', 'render', 'cli', 'generated', 'contract'].map((d) =>
  path.join(SRC, d),
);

describe('stable layers do not import optional peers', () => {
  const stableFiles = STABLE_DIRS.flatMap((dir) => {
    try {
      return walk(dir);
    } catch {
      return [];
    }
  });

  it('finds the stable source files', () => {
    expect(stableFiles.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN_IN_STABLE)('no stable file imports "%s"', (forbidden) => {
    const offenders = stableFiles.filter((file) =>
      importedModules(file).some((m) => m === forbidden || m.startsWith(`${forbidden}/`)),
    );
    expect(
      offenders.map((f) => path.relative(SRC, f)),
      `${forbidden} is imported by a stable layer`,
    ).toEqual([]);
  });

  it('no stable file imports anything under experimental/', () => {
    const offenders = stableFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /['"][^'"]*experimental\//.test(source);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('the stable render layer imports no Node-only module that a browser lacks', () => {
    // The render layer must stay browser-safe: it may compute a figure in a browser.
    // (The CLI is the Node surface and is exempt.)
    const renderFiles = walk(path.join(SRC, 'render'));
    const nodeOnly = ['node:fs', 'node:child_process', 'node:net', 'node:http', 'fs', 'child_process'];
    const offenders = renderFiles.filter((file) =>
      importedModules(file).some((m) => nodeOnly.includes(m)),
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
