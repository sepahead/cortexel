import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'src/authority/evaluators');
const evaluatorFiles = ['traces.ts', 'distributions.ts', 'matrices.ts', 'topology-dynamics.ts'];

const ALLOWED_EVALUATOR_IMPORTS = new Set([
  '../../core/binning.js',
  '../../core/canonicalize.js',
  '../../core/deterministic-transcendentals.js',
  '../../core/disclosures.js',
  '../../core/exact-binary64.js',
  '../../core/numeric.js',
  '../../core/output-authority.js',
  '../../core/parse-json.js',
  '../../core/response-curve-basis.js',
  '../../core/spatial.js',
  '../../core/units.js',
  './model.js',
]);

function staticImports(source: string): string[] {
  const imports: string[] = [];
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/gu)) imports.push(match[1]);
  for (const match of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gmu)) imports.push(match[1]);
  return imports;
}

describe('OutputAuthority evaluator independence boundary', () => {
  it('keeps every per-family evaluator on a closed pure-core import allowlist', () => {
    expect(readdirSync(directory).sort()).toEqual([
      'distributions.ts',
      'implementation-ids.ts',
      'matrices.ts',
      'model.ts',
      'registry.ts',
      'topology-dynamics.ts',
      'traces.ts',
    ]);
    for (const filename of evaluatorFiles) {
      const source = readFileSync(path.join(directory, filename), 'utf8');
      expect(staticImports(source).filter((specifier) => !ALLOWED_EVALUATOR_IMPORTS.has(specifier)), filename)
        .toEqual([]);
      expect(source, `${filename}: dynamic import can bypass the reviewed graph`).not.toMatch(/\bimport\s*\(/u);
      expect(source, `${filename}: require can bypass the reviewed graph`).not.toMatch(/\brequire\s*\(/u);
    }
  });

  it('keeps the clean-generator implementation inventory an import-free leaf', () => {
    const source = readFileSync(path.join(directory, 'implementation-ids.ts'), 'utf8');
    expect(staticImports(source)).toEqual([]);
    expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/u);
    expect(source).not.toMatch(/process\.env|Date\.|Math\.random/u);
  });

  it('does not permit render, compiler, generated-catalog, adapter, or analysis imports', () => {
    const forbidden = /\/(?:render|analysis|adapters|generated)\/|compile|buildFigure/u;
    for (const filename of evaluatorFiles) {
      for (const specifier of staticImports(readFileSync(path.join(directory, filename), 'utf8'))) {
        expect(specifier, `${filename}: evaluator import destroys independent derivation`).not.toMatch(forbidden);
      }
    }
  });

  it('mechanically closes the transitive evaluator graph against render/analysis/compiler code', () => {
    const pending = evaluatorFiles.map((filename) => path.join(directory, filename));
    const visited = new Set<string>();
    const forbidden = /(?:^|\/)(?:render|analysis|adapters)(?:\/|$)|generated\/catalog\.ts$|buildFigure|compile/u;

    while (pending.length > 0) {
      const filename = pending.pop()!;
      if (visited.has(filename)) continue;
      visited.add(filename);
      const relative = path.relative(root, filename).replaceAll(path.sep, '/');
      expect(relative, 'forbidden code entered the independent evaluator TCB').not.toMatch(forbidden);
      const source = readFileSync(filename, 'utf8');
      expect(source, `${relative}: dynamic loading bypasses the reviewed graph`).not.toMatch(/\bimport\s*\(|\brequire\s*\(/u);

      for (const specifier of staticImports(source)) {
        if (!specifier.startsWith('.')) continue;
        const typescriptPath = path.resolve(
          path.dirname(filename),
          specifier.endsWith('.js') ? `${specifier.slice(0, -3)}.ts` : specifier,
        );
        if (existsSync(typescriptPath)) pending.push(typescriptPath);
      }
    }

    // These shared pure-core primitives (and their registry/hash dependencies) form
    // the explicit trusted computing base. Family evaluators cannot reach around it.
    expect([...visited].some((file) => file.endsWith('/src/core/canonicalize.ts'))).toBe(true);
    expect([...visited].some((file) => file.endsWith('/src/core/exact-binary64.ts'))).toBe(true);
    expect([...visited].some((file) => file.endsWith('/src/core/units.ts'))).toBe(true);
  });
});
