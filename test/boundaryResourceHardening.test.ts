import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as generatedBudgets from '../src/generated/budgets.js';
import * as generatedCatalog from '../src/generated/catalog.js';
import * as generatedRegistry from '../src/generated/registry.js';
import { CanonicalizationError, canonicalize } from '../src/core/canonicalize.js';
import {
  finalizeErrors,
  makeError,
  safeText,
  summarizeValue,
} from '../src/core/errors.js';
import {
  getBudgetLimits,
  restrictLimits,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  type BudgetLimits,
} from '../src/core/limits.js';
import { parseJsonStrict } from '../src/core/parse-json.js';
import {
  buildFigure,
  buildFigureFromJson,
} from '../src/render/index.js';
import type { RenderPlanV1 } from '../src/render/model/renderPlan.js';
import { countPlanResources } from '../src/render/svg.js';

function example(skill: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, `../contract/skills/${skill}.v1.json`), 'utf8'),
  ).examples.valid[0] as Record<string, unknown>;
}

const populationRate = example('neuro.population_rate');
const adjacencyMatrix = example('network.adjacency_matrix');

function expectFailureCode(
  result: { readonly ok: boolean; readonly errors?: readonly { readonly code: string }[] },
  code: string,
): void {
  expect(result.ok).toBe(false);
  expect(result.errors?.map((error) => error.code)).toContain(code);
}

describe('closed and monotone budget authority', () => {
  it('rejects unknown, inherited-looking, boxed, and hostile profile ids', () => {
    expect(tryGetBudgetLimits('not-a-profile')).toBeUndefined();
    expect(tryGetBudgetLimits('__proto__')).toBeUndefined();
    expect(tryGetBudgetLimits('constructor')).toBeUndefined();
    expect(tryGetBudgetLimits(new String('agent'))).toBeUndefined();
    expect(trySelectTighterBudgetProfile('standard', 'not-a-profile')).toBeUndefined();

    for (const budgetProfile of ['not-a-profile', '__proto__', 'constructor']) {
      expectFailureCode(
        buildFigure(populationRate, { budgetProfile } as never),
        'RESOURCE_BUDGET_PROFILE_UNKNOWN',
      );

      const request = structuredClone(populationRate);
      request.presentation = { budgetProfile };
      expectFailureCode(buildFigure(request), 'RESOURCE_BUDGET_PROFILE_UNKNOWN');
    }

    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(() => buildFigure(populationRate, proxy as never)).not.toThrow();
    expectFailureCode(buildFigure(populationRate, proxy as never), 'RESOURCE_BUDGET_PROFILE_UNKNOWN');

    let getterCalls = 0;
    const accessorOptions = Object.defineProperty({}, 'budgetProfile', {
      get() {
        getterCalls++;
        return 'agent';
      },
    });
    expectFailureCode(
      buildFigure(populationRate, accessorOptions as never),
      'RESOURCE_BUDGET_PROFILE_UNKNOWN',
    );
    expect(getterCalls).toBe(0);

    const inheritedOptions = Object.create({ budgetProfile: 'agent' });
    const inheritedResult = buildFigure(populationRate, inheritedOptions);
    expect(inheritedResult.ok).toBe(true);
    if (inheritedResult.ok) {
      expect(
        (inheritedResult.artifact.inputAssurance as { budgetProfile: string }).budgetProfile,
      ).toBe('standard');
    }
  });

  it('uses the stricter request profile through buildFigure', () => {
    const request = structuredClone(populationRate);
    request.presentation = { budgetProfile: 'agent' };

    const result = buildFigure(request, { budgetProfile: 'standard' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.budgetDecision).toEqual({ outcome: 'accepted_full' });
    expect(result.artifact.inputAssurance).toMatchObject({ budgetProfile: 'agent' });
  });

  it('re-snapshots under a request-selected tighter profile before structural validation', () => {
    const request = structuredClone(populationRate);
    request.presentation = { budgetProfile: 'agent' };
    (request.data as Record<string, unknown>).oversizedProbe = 'x'.repeat(
      getBudgetLimits('agent').jsonStringLength + 1,
    );

    expectFailureCode(
      buildFigure(request, { budgetProfile: 'standard' }),
      'SNAPSHOT_STRING_TOO_LONG',
    );
    expectFailureCode(
      buildFigureFromJson(JSON.stringify(request), { budgetProfile: 'standard' }),
      'JSON_STRING_TOO_LONG',
    );
  });

  it('uses the stricter host profile through buildFigureFromJson', () => {
    const request = structuredClone(populationRate);
    request.presentation = { budgetProfile: 'standard' };

    const result = buildFigureFromJson(JSON.stringify(request), { budgetProfile: 'agent' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.budgetDecision).toEqual({ outcome: 'accepted_full' });
    expect(result.artifact.inputAssurance).toMatchObject({ budgetProfile: 'agent' });
  });

  it('restrictLimits never executes accessors, never widens, and returns frozen authority', () => {
    const standard = getBudgetLimits('standard');
    let overrideGetterCalls = 0;
    const inherited = { observationsPerRequest: 1 };
    const overrides = Object.create(inherited) as Record<string, unknown>;
    Object.defineProperty(overrides, 'visibleMarks', {
      enumerable: true,
      get() {
        overrideGetterCalls += 1;
        return 1;
      },
    });
    overrides.svgBytes = standard.svgBytes + 1_000_000;
    overrides.pairwiseOperations = standard.pairwiseOperations - 1;

    const restricted = restrictLimits(standard, overrides as Partial<BudgetLimits>);
    expect(overrideGetterCalls).toBe(0);
    expect(restricted.visibleMarks).toBe(standard.visibleMarks);
    expect(restricted.svgBytes).toBe(standard.svgBytes);
    expect(restricted.observationsPerRequest).toBe(standard.observationsPerRequest);
    expect(restricted.pairwiseOperations).toBe(standard.pairwiseOperations - 1);
    expect(Object.isFrozen(restricted)).toBe(true);
    expect(Object.getPrototypeOf(restricted)).toBe(null);

    let baseGetterCalls = 0;
    const hostileBase = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(standard)) hostileBase[key] = standard[key as keyof BudgetLimits];
    Object.defineProperty(hostileBase, 'visibleMarks', {
      enumerable: true,
      configurable: true,
      get() {
        baseGetterCalls += 1;
        return 1;
      },
    });
    expect(() => restrictLimits(hostileBase as unknown as BudgetLimits, {})).toThrow(
      /own finite non-negative data properties/u,
    );
    expect(baseGetterCalls).toBe(0);

    const revokedBase = Proxy.revocable({}, {});
    revokedBase.revoke();
    expect(() => restrictLimits(revokedBase.proxy as BudgetLimits, {})).toThrow(
      /could not be inspected safely/u,
    );
  });

  it('reports the exact 1001-squared logical matrix size under the agent profile', () => {
    const request = structuredClone(adjacencyMatrix);
    const data = request.data as { nodeUniverse: { ids: string[] } };
    data.nodeUniverse.ids = Array.from({ length: 1_001 }, (_, index) => String(index + 1));

    const result = buildFigure(request, { budgetProfile: 'agent' });
    expectFailureCode(result, 'RESOURCE_MATRIX_CELLS_EXCEEDED');
    if (result.ok) return;

    const error = result.errors.find((candidate) => candidate.code === 'RESOURCE_MATRIX_CELLS_EXCEEDED');
    expect(error?.limit).toEqual({
      name: 'matrixCells',
      limit: 1_000_000,
      observed: 1_002_001,
    });
  });
});

describe('diagnostic totality and bounded display text', () => {
  it('summarizes a revoked Proxy without throwing', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(() => summarizeValue(proxy)).not.toThrow();
    expect(summarizeValue(proxy)).toBe('<uninspectable-object>');
  });

  it('never splits an astral code point or a generated lone-surrogate escape', () => {
    expect(safeText('😂', 2)).toBe('😂');
    expect(safeText(`A😂B`, 3)).toBe('A…');
    expect(safeText(`A😂B`, 4)).toBe(`A😂B`);
    expect(safeText('\ud800x', 7)).toBe('\\ud800x');
    expect(safeText('\ud800x', 6)).toBe('…');
  });

  it('caps a diagnostic batch at exactly 32 records including the limit record', () => {
    const errors = Array.from({ length: 40 }, (_, index) =>
      makeError({
        code: 'SCHEMA_TYPE_MISMATCH',
        stage: 'structural',
        instancePath: `/data/${index}`,
        message: 'wrong type',
      }),
    );

    const finalized = finalizeErrors(errors);
    expect(finalized).toHaveLength(32);
    expect(finalized.at(-1)).toMatchObject({
      code: 'ERROR_LIMIT_REACHED',
      omittedCount: 9,
    });
  });

  it('orders diagnostic paths by the registry-defined Unicode code-point order', () => {
    const errors = ['\u{10000}', '\ue000'].map((suffix) =>
      makeError({
        code: 'SCHEMA_UNKNOWN_PROPERTY',
        stage: 'structural',
        instancePath: `/parameters/${suffix}`,
        message: 'unknown property',
      }));

    expect(finalizeErrors(errors).map((error) => error.instancePath)).toEqual([
      '/parameters/\ue000',
      '/parameters/\u{10000}',
    ]);

    const validatorTies = ['\u{10000}', '\ue000'].map((validatorId) =>
      makeError({
        code: 'SCHEMA_UNKNOWN_PROPERTY',
        stage: 'structural',
        instancePath: '/same',
        validatorId,
        message: 'unknown property',
      }));
    expect(finalizeErrors(validatorTies).map((error) => error.validatorId)).toEqual([
      '\ue000',
      '\u{10000}',
    ]);
  });
});

describe('render resource accounting', () => {
  it('counts the exact SVG data marks emitted, not packed path vertices', () => {
    const plan = {
      version: 1,
      figureId: 'fig-test',
      skillId: 'test.skill',
      width: 320,
      height: 240,
      title: 'Test',
      themeId: 'light',
      sourceRequestDigest: `sha256:${'0'.repeat(64)}`,
      disclosures: [],
      panels: [
        {
          id: 'main',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          axes: [],
          marks: [
            { type: 'line', subpaths: [[{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 2, y: 2 }]], stroke: '#000', strokeWidth: 1 },
            { type: 'area', subpaths: [[{ x: 0, y0: 0, y1: 1 }], [{ x: 1, y0: 0, y1: 2 }]], fill: '#000', opacity: 0.5 },
            { type: 'point', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], fill: '#000', radius: 1, shape: 'circle' },
            { type: 'rect', rects: [{ x: 0, y: 0, width: 1, height: 1, fill: '#000' }] },
            { type: 'rule', orientation: 'vertical', lines: [{ position: 0, from: 0, to: 1 }, { position: 1, from: 0, to: 1 }], stroke: '#000', strokeWidth: 1 },
            { type: 'text', x: 0, y: 0, text: 'datum', anchor: 'start', fontSize: 10, fill: '#000' },
            { type: 'group', id: 'nested', marks: [{ type: 'path', subpaths: [[{ x: 0, y: 0 }]], stroke: '#000', strokeWidth: 1 }] },
          ],
        },
      ],
      table: { policy: 'complete_returned', columns: [], rows: [], rowsInline: 0, rowsTotal: 0 },
      accessibility: { summary: 'Test.', panelSummaries: [] },
    } satisfies RenderPlanV1;

    expect(countPlanResources(plan)).toEqual({ markCount: 10, textCount: 2 });
  });
});

describe('canonicalization rejects decorated or uninspectable materialized values', () => {
  it('rejects object and array accessors without invoking their getters', () => {
    let getterCalls = 0;
    const record: Record<string, unknown> = {};
    Object.defineProperty(record, 'answer', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 42;
      },
    });

    const array: unknown[] = [];
    Object.defineProperty(array, '0', {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 42;
      },
    });

    expect(() => canonicalize(record)).toThrow(CanonicalizationError);
    expect(() => canonicalize(array)).toThrow(CanonicalizationError);
    expect(getterCalls).toBe(0);
  });

  it('rejects symbol members, sparse arrays, and named array members', () => {
    const symbolRecord = { answer: 42 } as Record<PropertyKey, unknown>;
    symbolRecord[Symbol('hidden')] = true;

    const sparse = new Array(2);
    sparse[0] = 1;

    const named = [1] as unknown[] & { note?: string };
    named.note = 'not JSON';

    expect(() => canonicalize(symbolRecord)).toThrow(CanonicalizationError);
    expect(() => canonicalize(sparse)).toThrow(CanonicalizationError);
    expect(() => canonicalize(named)).toThrow(CanonicalizationError);
  });

  it('turns revoked Proxy inspection failures into a canonicalization domain error', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(() => canonicalize(proxy)).toThrow(CanonicalizationError);
  });

  it('reports escaped RFC 6901 paths for hostile member names', () => {
    try {
      canonicalize({ 'a/b~': undefined });
      throw new Error('expected canonicalization to reject undefined');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalizationError);
      expect((error as CanonicalizationError).path).toBe('/a~1b~0');
    }
  });
});

describe('strict parser is total for hostile API arguments', () => {
  const limits = getBudgetLimits('standard');

  it('rejects a non-string input without throwing', () => {
    expect(() => parseJsonStrict(42 as never, { limits })).not.toThrow();
    expectFailureCode(parseJsonStrict(42 as never, { limits }), 'JSON_SYNTAX');
  });

  it('rejects absent, accessor-backed, and proxy-trapped options without throwing', () => {
    let accessorCalls = 0;
    const accessorOptions = Object.defineProperty({}, 'limits', {
      get() {
        accessorCalls++;
        throw new Error('hostile options getter');
      },
    });
    const trappedOptions = new Proxy({}, {
      get() {
        throw new Error('hostile options proxy');
      },
    });
    const trappedLimits = new Proxy({}, {
      get() {
        throw new Error('hostile limits proxy');
      },
    });

    for (const options of [null, accessorOptions, trappedOptions, { limits: trappedLimits }]) {
      expect(() => parseJsonStrict('{}', options as never)).not.toThrow();
      expectFailureCode(
        parseJsonStrict('{}', options as never),
        'INTERNAL_INVARIANT_VIOLATED',
      );
    }
    expect(accessorCalls).toBe(0);

    let limitGetterCalls = 0;
    const accessorLimits = Object.create(null);
    Object.defineProperty(accessorLimits, 'rawInputBytes', {
      enumerable: true,
      get() {
        limitGetterCalls++;
        return limits.rawInputBytes;
      },
    });
    expectFailureCode(
      parseJsonStrict('{}', { limits: accessorLimits } as never),
      'INTERNAL_INVARIANT_VIOLATED',
    );
    expect(limitGetterCalls).toBe(0);
  });
});

describe('generated TypeScript registries are immutable global authority', () => {
  function assertDeepGeneratedAuthority(value: unknown, seen = new Set<object>()): void {
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);

    expect(Object.isFrozen(value)).toBe(true);
    if (Array.isArray(value)) {
      expect(Object.getPrototypeOf(value)).toBe(Array.prototype);
      for (const child of value) assertDeepGeneratedAuthority(child, seen);
      return;
    }

    expect(Object.getPrototypeOf(value)).toBe(null);
    for (const child of Object.values(value as Record<string, unknown>)) {
      assertDeepGeneratedAuthority(child, seen);
    }
  }

  it('deep-freezes every object export from the generated registry, catalog, and budgets', () => {
    for (const generatedModule of [generatedRegistry, generatedCatalog, generatedBudgets]) {
      for (const value of Object.values(generatedModule)) assertDeepGeneratedAuthority(value);
    }
  });
});
