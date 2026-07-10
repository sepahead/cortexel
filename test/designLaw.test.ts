import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ts from 'typescript';

// Executable guards for the Cortexel design law (previously prose-only):
//   * useFrame must be allocation-free (no `new THREE.*` per frame),
//   * emissive intensity stays bloom-safe (<= 1.15) to avoid white blowout,
//   * populations are unlit (MeshBasic), never an emissive standard material.
// Source-level scan — no rendering required.
const here = dirname(fileURLToPath(import.meta.url));
const reactDir = join(here, '..', 'react');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory()
      ? walk(p)
      : /\.tsx?$/.test(p)
        ? [p]
        : [];
  });
}

/** Find actual allocation AST nodes inside useFrame callbacks. This catches the
 *  array/object literals the previous regex claimed to cover but missed. */
function useFrameAllocations(src: string, file: string): string[] {
  const source = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const allocations: string[] = [];

  function inspectCallback(node: ts.Node): void {
    if (ts.isNewExpression(node)) allocations.push('new expression');
    if (ts.isArrayLiteralExpression(node)) allocations.push('array literal');
    if (ts.isObjectLiteralExpression(node)) allocations.push('object literal');
    if (ts.isForOfStatement(node)) allocations.push('for-of iterator');
    ts.forEachChild(node, inspectCallback);
  }
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useFrame'
    ) {
      const callback = node.arguments[0];
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        inspectCallback(callback.body);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return allocations;
}

describe('design law (executable)', () => {
  const files = walk(reactDir);

  it('useFrame callbacks allocate nothing per frame', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const kind of useFrameAllocations(readFileSync(f, 'utf8'), f)) {
        offenders.push(`${f}: ${kind} inside useFrame`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('shipped React code has no implicit network/worker loader path', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/from\s+['"]@react-three\/drei/.test(src)) offenders.push(`${f}: drei import`);
      if (/\b(fetch|XMLHttpRequest|Worker)\s*\(/.test(src)) {
        offenders.push(`${f}: network/worker constructor`);
      }
      if (/fonts\.gstatic|cdn\.jsdelivr/.test(src)) offenders.push(`${f}: CDN URL`);
    }
    expect(offenders).toEqual([]);
  });

  it('emissive intensity stays bloom-safe (<= 1.15)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const re = /emissiveIntensity[=:]\s*\{?\s*([0-9]+(?:\.[0-9]+)?)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (parseFloat(m[1]) > 1.15) offenders.push(`${f}: emissiveIntensity ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('populations use an unlit material (no emissive standard material)', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // A standard material carrying emissive is a bloom/honesty hazard for the
      // passive population voxel; flag it if it appears.
      expect(
        /meshStandardMaterial[^>]*emissive/.test(src),
        `${f} uses an emissive standard material`,
      ).toBe(false);
    }
  });

  it('directed knowledge-graph edges have a static, reduced-motion-safe cue', () => {
    const source = readFileSync(join(reactDir, 'KnowledgeGraph3DScene.tsx'), 'utf8');
    expect(source).toContain('<coneGeometry');
    expect(source).toContain('directedEdges');
  });
});
