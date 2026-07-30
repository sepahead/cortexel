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

function enclosingLifecycleHook(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      (
        current.expression.text === 'useEffect' ||
        current.expression.text === 'useLayoutEffect' ||
        current.expression.text === 'useFrame'
      )
    ) {
      return current.expression.text;
    }
    current = current.parent;
  }
  return null;
}

/** Locate the exact render-purity-sensitive operations in the graph scene and
 * report the lifecycle boundary lexically containing each one. */
function knowledgeGraphLifecycleOperations(src: string, file: string): string[] {
  const source = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const operations: string[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'posMap' &&
      node.name.text === 'current'
    ) {
      operations.push(`position-ref:${enclosingLifecycleHook(node) ?? 'render'}`);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'installFocusLabelResource'
    ) {
      operations.push(`label-resource-install:${enclosingLifecycleHook(node) ?? 'render'}`);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'publishGraphLayoutCache'
    ) {
      operations.push(`cache-publish:${enclosingLifecycleHook(node) ?? 'render'}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return operations;
}

/** Calls/new/throws after cache publication would invalidate the rule that a
 * callback failure leaves the prior cache authority untouched. Inspect every
 * remaining sibling statement up through the containing useFrame callback. */
function knowledgeGraphPostPublishFallibleOperations(
  src: string,
  file: string,
): string[] {
  const source = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const offenders: string[] = [];

  function inspect(node: ts.Node): void {
    if (ts.isCallExpression(node)) offenders.push('call');
    if (ts.isNewExpression(node)) offenders.push('new');
    if (ts.isThrowStatement(node)) offenders.push('throw');
    if (ts.isAwaitExpression(node)) offenders.push('await');
    if (ts.isYieldExpression(node)) offenders.push('yield');
    ts.forEachChild(node, inspect);
  }

  function inspectAfterPublication(node: ts.CallExpression): void {
    let cursor: ts.Node = node;
    while (cursor.parent) {
      const parent = cursor.parent;
      if (ts.isBlock(parent)) {
        const containingIndex = parent.statements.findIndex(
          (statement) => statement === cursor ||
            (statement.pos <= cursor.pos && statement.end >= cursor.end),
        );
        if (containingIndex >= 0) {
          for (let index = containingIndex + 1; index < parent.statements.length; index++) {
            inspect(parent.statements[index]);
          }
        }
        const owner = parent.parent;
        if (
          (ts.isArrowFunction(owner) || ts.isFunctionExpression(owner)) &&
          ts.isCallExpression(owner.parent) &&
          ts.isIdentifier(owner.parent.expression) &&
          owner.parent.expression.text === 'useFrame'
        ) return;
      }
      cursor = parent;
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'publishGraphLayoutCache'
    ) {
      inspectAfterPublication(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return offenders;
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

  it('keeps knowledge-graph position authority and label allocation out of render', () => {
    const file = join(reactDir, 'KnowledgeGraph3DScene.tsx');
    const source = readFileSync(file, 'utf8');
    const operations = knowledgeGraphLifecycleOperations(source, file);
    expect(operations).toContain('position-ref:useEffect');
    expect(operations).not.toContain('position-ref:useFrame');
    expect(operations).toContain('cache-publish:useFrame');
    expect(operations).toContain('label-resource-install:useLayoutEffect');
    expect(operations.filter((operation) => operation.endsWith(':render'))).toEqual([]);
    expect(knowledgeGraphPostPublishFallibleOperations(source, file)).toEqual([]);

    const helper = readFileSync(
      join(reactDir, 'focusLabelResource.internal.ts'),
      'utf8',
    );
    expect(helper).toContain("document.createElement('canvas')");
    expect(helper).toContain('new THREE.CanvasTexture(canvas)');
    expect(helper).toContain('texture.dispose()');
  });

  it('orders graph readiness, event interception, and auto-frame commitment safely', () => {
    const source = readFileSync(
      join(reactDir, 'KnowledgeGraph3DScene.tsx'),
      'utf8',
    );
    const geometryStart = source.indexOf('    if (positionsChanged) {');
    const firstMatrixWrite = source.indexOf('mesh.setMatrixAt', geometryStart);
    const dirtyBeforeWrite = source.indexOf(
      'geometryDirtyRef.current = true;',
      geometryStart,
    );
    const hideBeforeWrite = source.indexOf('sceneGroup.visible = false;', geometryStart);
    expect(geometryStart).toBeGreaterThanOrEqual(0);
    expect(dirtyBeforeWrite).toBeGreaterThan(geometryStart);
    expect(hideBeforeWrite).toBeGreaterThan(geometryStart);
    expect(dirtyBeforeWrite).toBeLessThan(firstMatrixWrite);
    expect(hideBeforeWrite).toBeLessThan(firstMatrixWrite);

    const moveStart = source.indexOf('  const handleMove = useCallback(');
    const moveEnd = source.indexOf('  const handleOut = useCallback(', moveStart);
    const move = source.slice(moveStart, moveEnd);
    expect(move.indexOf('e.stopPropagation()')).toBeGreaterThan(
      move.indexOf('if (e.instanceId == null'),
    );

    const clickStart = source.indexOf('  const handleClick = useCallback(');
    const clickEnd = source.indexOf('\n\n  return (', clickStart);
    const click = source.slice(clickStart, clickEnd);
    expect(click.indexOf('e.stopPropagation()')).toBeGreaterThan(
      click.indexOf('if (e.instanceId != null'),
    );

    const autoFrameStart = source.indexOf('      autoFrame &&');
    const autoFrameEnd = source.indexOf(
      '    // Ease the camera target',
      autoFrameStart,
    );
    const autoFrame = source.slice(autoFrameStart, autoFrameEnd);
    expect(autoFrame.indexOf('framedRef.current = true;')).toBeGreaterThan(
      autoFrame.indexOf('controls.update();'),
    );
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
