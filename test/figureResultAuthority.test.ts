import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import {
  assertLiveBuiltFigureResult,
  buildFigure,
  buildFigureFromValidated,
  isLiveBuiltFigureResult,
} from '../src/render/buildFigure.js';
import * as publicRenderer from '../src/render/index.js';

const example = JSON.parse(readFileSync(
  path.resolve(
    import.meta.dirname,
    '../contract/skills/neuro.population_rate.v1.json',
  ),
  'utf8',
)).examples.valid[0];

function successfulResult() {
  const result = buildFigure(example);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function expectRecursivelyFrozen(root: object): void {
  const seen = new WeakSet<object>();
  const pending: object[] = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    expect(Object.isFrozen(current)).toBe(true);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor === undefined || !('value' in descriptor)) continue;
      const child: unknown = descriptor.value;
      if (child !== null && typeof child === 'object') pending.push(child);
    }
  }
}

describe('live built-figure result authority', () => {
  it('is minted only on the exact deeply frozen successful result', () => {
    const result = successfulResult();

    expect(isLiveBuiltFigureResult(result)).toBe(true);
    expect(() => assertLiveBuiltFigureResult(result)).not.toThrow();
    expect(Reflect.ownKeys(result)).toEqual([
      'ok',
      'artifact',
      'svg',
      'plan',
      'table',
      'disclosures',
    ]);
    expect(Object.getOwnPropertySymbols(result)).toEqual([]);
    expectRecursivelyFrozen(result);
    expect(result.table).toBe(result.plan.table);

    const spread = { ...result };
    expect(Reflect.ownKeys(spread)).toEqual(Reflect.ownKeys(result));
    expect(isLiveBuiltFigureResult(spread)).toBe(false);

    const failure = buildFigure({});
    expect(failure.ok).toBe(false);
    expect(isLiveBuiltFigureResult(failure)).toBe(false);
  });

  it('does not mint a validated request whose layout cannot be rendered', () => {
    const request = structuredClone(example);
    request.presentation = { ...request.presentation, width: 160 };
    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(JSON.stringify(validated.errors));

    const result = buildFigureFromValidated(validated.request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('the width-160 population-rate fixture must fail');
    expect(result.errors.map((error) => error.code)).toEqual([
      'RENDER_LAYOUT_UNAVAILABLE',
    ]);
    expect(isLiveBuiltFigureResult(result)).toBe(false);
    expect(() => assertLiveBuiltFigureResult(result)).toThrow(/exact live result/u);
  });

  it('rejects every reconstructed or transferred lookalike by identity', () => {
    const result = successfulResult();
    const candidates: readonly unknown[] = [
      { ...result },
      structuredClone(result),
      JSON.parse(JSON.stringify(result)),
      {
        ok: true,
        artifact: result.artifact,
        svg: result.svg,
        plan: result.plan,
        table: result.table,
        disclosures: result.disclosures,
      },
      runInNewContext(
        '({ ok: true, artifact, svg, plan, table, disclosures })',
        {
          artifact: result.artifact,
          svg: result.svg,
          plan: result.plan,
          table: result.table,
          disclosures: result.disclosures,
        },
      ),
    ];

    for (const candidate of candidates) {
      expect(isLiveBuiltFigureResult(candidate)).toBe(false);
      expect(() => assertLiveBuiltFigureResult(candidate)).toThrow(
        /exact live result/u,
      );
    }
  });

  it('rejects a hostile Proxy before invoking any candidate trap', () => {
    const result = successfulResult();
    let traps = 0;
    const trapped = (): never => {
      traps++;
      throw new Error('built-result authority inspected an untrusted proxy');
    };
    const hostile = new Proxy(result, {
      get: trapped,
      getOwnPropertyDescriptor: trapped,
      getPrototypeOf: trapped,
      has: trapped,
      ownKeys: trapped,
    });

    expect(isLiveBuiltFigureResult(hostile)).toBe(false);
    expect(() => assertLiveBuiltFigureResult(hostile)).toThrow(/exact live result/u);
    expect(traps).toBe(0);
  });

  it('does not transfer authority between duplicate physical installations', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-result-authority-'));
    const duplicateRoot = path.join(temporary, 'cortexel');
    mkdirSync(duplicateRoot, { mode: 0o700 });
    cpSync(path.join(root, 'package.json'), path.join(duplicateRoot, 'package.json'));
    cpSync(path.join(root, 'dist'), path.join(duplicateRoot, 'dist'), {
      recursive: true,
    });
    symlinkSync(path.join(root, 'node_modules'), path.join(duplicateRoot, 'node_modules'));

    type Runtime = {
      buildFigure(value: unknown): unknown;
      isLiveBuiltFigureResult(value: unknown): boolean;
    };
    try {
      const installedRequire = createRequire(path.join(root, 'package.json'));
      const duplicateRequire = createRequire(path.join(duplicateRoot, 'package.json'));
      const installedRenderer = installedRequire(
        './dist/render-svg/index.cjs',
      ) as Runtime;
      const duplicateRenderer = duplicateRequire(
        './dist/render-svg/index.cjs',
      ) as Runtime;
      const installedAuthority = installedRequire(
        '#cortexel-figure-result-capability',
      ) as Runtime;
      const duplicateAuthority = duplicateRequire(
        '#cortexel-figure-result-capability',
      ) as Runtime;

      const installedResult = installedRenderer.buildFigure(example);
      const duplicateResult = duplicateRenderer.buildFigure(example);
      expect(installedAuthority.isLiveBuiltFigureResult(installedResult)).toBe(true);
      expect(duplicateAuthority.isLiveBuiltFigureResult(duplicateResult)).toBe(true);
      expect(installedAuthority.isLiveBuiltFigureResult(duplicateResult)).toBe(false);
      expect(duplicateAuthority.isLiveBuiltFigureResult(installedResult)).toBe(false);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('shares one result registry across native Node ESM and CommonJS surfaces', () => {
    const root = path.resolve(import.meta.dirname, '..');
    // Vitest's SSR evaluator transforms repository ESM and may evaluate an imported
    // CommonJS dependency in its own module graph. Comparing that graph with a native
    // createRequire cache would test the harness, not Cortexel's installed Node loader.
    // Keep the production identity assertion in one untransformed Node process.
    const source = String.raw`
      import { readFileSync } from 'node:fs';
      import { createRequire } from 'node:module';
      import path from 'node:path';
      import { pathToFileURL } from 'node:url';

      const root = process.argv[1];
      const packageRequire = createRequire(path.join(root, 'package.json'));
      const capabilitySpecifier = '#cortexel-figure-result-capability';
      const capabilityPath = packageRequire.resolve(capabilitySpecifier);
      const authority = packageRequire(capabilitySpecifier);
      const esmRenderer = await import(
        pathToFileURL(path.join(root, 'dist/render-svg/index.js')).href
      );
      const cjsRenderer = packageRequire(
        path.join(root, 'dist/render-svg/index.cjs')
      );
      const contract = JSON.parse(readFileSync(
        path.join(root, 'contract/skills/neuro.population_rate.v1.json'),
        'utf8',
      ));
      const example = contract.examples.valid[0];
      const esmResult = esmRenderer.buildFigure(example);
      const cjsResult = cjsRenderer.buildFigure(example);

      // Negative control: re-evaluating the exact same physical capability after an
      // explicit cache eviction must create a distinct WeakSet authority. This is the
      // same category of split that a transforming test-module evaluator can create;
      // it must not be confused with the normal installed package loader.
      delete packageRequire.cache[capabilityPath];
      const reloadedAuthority = packageRequire(capabilitySpecifier);
      const reloadedResult = reloadedAuthority.buildFigure(example);

      process.stdout.write(JSON.stringify({
        native: {
          esmBuilderIsAuthority: esmRenderer.buildFigure === authority.buildFigure,
          cjsBuilderIsAuthority: cjsRenderer.buildFigure === authority.buildFigure,
          esmResultSucceeded: esmResult.ok === true,
          cjsResultSucceeded: cjsResult.ok === true,
          esmResultAccepted: authority.isLiveBuiltFigureResult(esmResult),
          cjsResultAccepted: authority.isLiveBuiltFigureResult(cjsResult),
        },
        reevaluationControl: {
          newModuleInstance: reloadedAuthority !== authority,
          newBuilderIdentity: reloadedAuthority.buildFigure !== authority.buildFigure,
          rejectsOriginalResult: !reloadedAuthority.isLiveBuiltFigureResult(esmResult),
          originalRejectsReloadedResult: !authority.isLiveBuiltFigureResult(reloadedResult),
          acceptsOwnResult: reloadedAuthority.isLiveBuiltFigureResult(reloadedResult),
        },
      }));
    `;
    const probe = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', source, root],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      },
    );
    if (probe.error !== undefined || probe.status !== 0 || probe.signal !== null) {
      throw new Error(
        `native Node figure-result probe failed: ${probe.error?.message ?? probe.stderr}`,
      );
    }
    expect(JSON.parse(probe.stdout)).toEqual({
      native: {
        esmBuilderIsAuthority: true,
        cjsBuilderIsAuthority: true,
        esmResultSucceeded: true,
        cjsResultSucceeded: true,
        esmResultAccepted: true,
        cjsResultAccepted: true,
      },
      reevaluationControl: {
        newModuleInstance: true,
        newBuilderIdentity: true,
        rejectsOriginalResult: true,
        originalRejectsReloadedResult: true,
        acceptsOwnResult: true,
      },
    });
  });

  it('keeps predicates and guards off the public render-svg surface', () => {
    const exports = publicRenderer as unknown as Record<string, unknown>;
    expect(exports.isLiveBuiltFigureResult).toBeUndefined();
    expect(exports.assertLiveBuiltFigureResult).toBeUndefined();
    expect(Object.keys(exports).sort()).toEqual([
      'buildFigure',
      'buildFigureFromJson',
      'buildFigureFromValidated',
    ]);
  });
});
