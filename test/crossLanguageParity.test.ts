/**
 * Cross-language parity: the TypeScript and Python implementations must AGREE.
 *
 * This is what makes the second implementation worth having. It runs the Python package
 * (no shared code, no Node inside it) over the same contract examples and asserts:
 *
 *   1. Canonical digests are BYTE-IDENTICAL. If the two RFC 8785 implementations disagree
 *      on one byte, every reproducibility claim in the project is false. This is the
 *      strongest parity guarantee and the one that matters most.
 *   2. Both accept every valid example.
 *   3. Both reject a forged caller conclusion, and both reject a unit alias.
 *   4. Independent response-curve evaluators agree on denominator authority, exact
 *      count-to-rate arithmetic, kernel identity, and binary64 peak-grid geometry.
 *
 * Where Python has not yet ported a deeper semantic validator, the test does not assert
 * agreement on that rule — it asserts agreement on the independently implemented subset,
 * honestly (docs/KNOWN_LIMITATIONS.md).
 *
 * If Python 3 is unavailable the suite skips rather than fails, so the TypeScript CI stays
 * green on a machine without a Python interpreter.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { getBudgetLimits } from '../src/core/limits.js';
import { parseAndValidateRequest, validateRequestValue } from '../src/core/request.js';
import { validateStructure } from '../src/core/structural-validator.js';
import { deriveExactAggregateCountRateInUnit } from '../src/core/units.js';
import { UNITS, UNIT_ALIASES } from '../src/generated/registry.js';
import { buildFigure } from '../src/render/buildFigure.js';

const REPO = path.resolve(import.meta.dirname, '..');
const CONTRACT_SKILLS = path.join(REPO, 'contract/skills');
const SCRATCH = path.join(REPO, 'node_modules/.cache/cortexel-parity');
// These bounded proofs start an independent Python interpreter over the complete
// living contract corpus. Under Vitest's file-parallel load they can legitimately
// exceed the generic five-second unit-test default without being unbounded.
const PARITY_PROOF_TIMEOUT_MS = 30_000;
// This finite product deliberately executes more than 10,000 complete TypeScript
// figure boundaries plus one independent Python batch. A cold serialized CI run has
// measured above 60 seconds, so keep a bounded but non-flaky proof-specific ceiling.
const EXHAUSTIVE_DIMENSION_PARITY_TIMEOUT_MS = 120_000;

let pythonAvailable = false;
function python(args: string[], input?: string): string {
  return execFileSync('python3', args, {
    cwd: REPO,
    encoding: 'utf8',
    input,
    env: { ...process.env, PYTHONPATH: path.join(REPO, 'python/src') },
  });
}

beforeAll(() => {
  try {
    python(['-c', 'import cortexel']);
    pythonAvailable = true;
    readdirSync(REPO); // touch fs so SCRATCH parent exists
    try {
      execFileSync('mkdir', ['-p', SCRATCH]);
    } catch {
      /* best effort */
    }
  } catch {
    pythonAvailable = false;
  }
});

const contracts = readdirSync(CONTRACT_SKILLS)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(CONTRACT_SKILLS, f), 'utf8')) as {
    id: string;
    revision: number;
    examples: { valid: Record<string, unknown>[]; invalid: { expectedCode: string; request: unknown }[] };
  });

interface LivingUnitOccurrence {
  readonly path: readonly (string | number)[];
  readonly unit: string;
}

/** Closed scalar vocabulary shared with the runtime's source-schema closure gate. */
const UNIT_CODE_PROPERTIES = Object.freeze(['alignmentUnit', 'unit', 'valueUnit'] as const);

function collectLivingUnitOccurrences(
  value: unknown,
  currentPath: readonly (string | number)[] = [],
  found: LivingUnitOccurrence[] = [],
): LivingUnitOccurrence[] {
  if (value === null || typeof value !== 'object') return found;
  if (!Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const property of UNIT_CODE_PROPERTIES) {
      if (typeof record[property] !== 'string') continue;
      found.push({ path: [...currentPath, property], unit: record[property] });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (child === null || typeof child !== 'object') continue;
    collectLivingUnitOccurrences(
      child,
      [...currentPath, Array.isArray(value) ? Number(key) : key],
      found,
    );
  }
  return found;
}

function replaceLivingValue(
  request: Record<string, any>,
  occurrencePath: readonly (string | number)[],
  value: unknown,
): void {
  let target: any = request;
  for (const segment of occurrencePath.slice(0, -1)) target = target[segment];
  target[occurrencePath[occurrencePath.length - 1]] = value;
}

function instancePointer(segments: readonly (string | number)[]): string {
  return segments
    .map((segment) => `/${String(segment).replace(/~/g, '~0').replace(/\//g, '~1')}`)
    .join('');
}

/** Ask Python for the canonical digest of each of a batch of values. */
function pythonDigests(values: unknown[]): string[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([cortexel.canonical_digest(v) for v in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as string[];
}

/** Ask Python whether each request validates (empty error list). */
function pythonValid(values: unknown[]): boolean[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([len(cortexel.validate_request_partial(v)) == 0 for v in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as boolean[];
}

/** Ask Python for the exact ordered error-code list at its partial validation boundary. */
function pythonErrorCodes(values: unknown[]): string[][] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([[error.code for error in cortexel.validate_request_partial(value)] for value in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as string[][];
}

/** Ask Python for the portable ordered diagnostic identity, without comparing prose. */
function pythonDiagnostics(values: unknown[]): Array<Array<{
  code: string;
  stage: string;
  instancePath: string;
}>> {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([[
    {'code': error.code, 'stage': error.stage, 'instancePath': error.instance_path}
    for error in cortexel.validate_request_partial(value)
] for value in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as Array<Array<{
    code: string;
    stage: string;
    instancePath: string;
  }>>;
}

interface PythonUnitDimensionComparison {
  readonly mismatchCount: number;
  readonly mismatches: readonly {
    readonly index: number;
    readonly actual: readonly string[];
  }[];
}

/** Compare the exhaustive unit product in Python while keeping stdout bounded. */
function pythonUnitDimensionComparison(values: unknown[]): PythonUnitDimensionComparison {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
mismatches = []
mismatch_count = 0
for index, value in enumerate(values):
    actual = [
        error.instance_path
        for error in cortexel.validate_request_partial(value['request'])
        if error.code == 'SCIENCE_UNIT_DIMENSION_MISMATCH'
    ]
    if actual != value['expectedPaths']:
        mismatch_count += 1
        if len(mismatches) < 64:
            mismatches.append({'index': index, 'actual': actual})
print(json.dumps({'mismatchCount': mismatch_count, 'mismatches': mismatches}))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as PythonUnitDimensionComparison;
}

interface PortableDiagnosticRecord {
  readonly code: string;
  readonly stage: string;
  readonly instancePath: string;
  readonly omittedCount?: number;
}

/** Include the cap receipt when proving diagnostic-budget parity. */
function pythonDiagnosticRecords(values: unknown[]): PortableDiagnosticRecord[][] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([[
    {
        'code': error.code,
        'stage': error.stage,
        'instancePath': error.instance_path,
        **({'omittedCount': error.omitted_count} if error.omitted_count is not None else {}),
    }
    for error in cortexel.validate_request_partial(value)
] for value in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as PortableDiagnosticRecord[][];
}

function typescriptDiagnosticRecords(request: unknown): PortableDiagnosticRecord[] {
  const result = buildFigure(request);
  if (result.ok) return [];
  return result.errors.map((error) => ({
    code: error.code,
    stage: error.stage,
    instancePath: error.instancePath,
    ...('omittedCount' in error && typeof error.omittedCount === 'number'
      ? { omittedCount: error.omittedCount }
      : {}),
  }));
}

/** Ask Python for only the generated-schema decision, before partial semantic ports. */
function pythonStructureValid(values: Array<{ skill: string; request: unknown }>): boolean[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
from cortexel.validate import _load_schema, _validate_schema
values = json.load(sys.stdin)
results = []
for value in values:
    errors = []
    schema = _load_schema('schemas/skills/' + value['skill'] + '.request.v1.schema.json')
    _validate_schema(value['request'], schema, '', errors)
    results.append(len(errors) == 0)
print(json.dumps(results))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as boolean[];
}

/** Parse raw JSON independently in both implementations before validating it. */
function pythonTextValid(texts: string[]): boolean[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
texts = json.load(sys.stdin)
results = []
for text in texts:
    try:
        value = cortexel.parse_json_strict(text)
        results.append(len(cortexel.validate_request_partial(value)) == 0)
    except cortexel.JsonParseError:
        results.append(False)
print(json.dumps(results))
`;
  const out = python(['-c', script], JSON.stringify(texts));
  return JSON.parse(out) as boolean[];
}

describe('cross-language parity — TypeScript vs Python', () => {
  it('runs only when Python 3 and the cortexel package are importable', () => {
    if (!pythonAvailable) {
      console.warn('Python 3 / cortexel not available — parity suite skipped.');
    }
    expect(true).toBe(true);
  });

  it('agrees on the canonical digest of every valid example, byte for byte', () => {
    if (!pythonAvailable) return;
    const values = contracts.flatMap((c) => c.examples.valid);
    const tsDigests = values.map((v) => canonicalDigest(v));
    const pyDigests = pythonDigests(values);

    expect(pyDigests).toHaveLength(tsDigests.length);
    for (let i = 0; i < tsDigests.length; i++) {
      expect(pyDigests[i], `digest mismatch on example ${i}`).toBe(tsDigests[i]);
    }
  }, PARITY_PROOF_TIMEOUT_MS);

  it('agrees that every valid example is accepted', () => {
    if (!pythonAvailable) return;
    const values = contracts.flatMap((c) => c.examples.valid);
    const tsValid = values.map((v) => validateRequestValue(v).ok);
    const pyValid = pythonValid(values);

    for (let i = 0; i < values.length; i++) {
      expect(tsValid[i], `TS rejected valid example ${i}`).toBe(true);
      expect(pyValid[i], `Python rejected valid example ${i}`).toBe(true);
    }
  }, PARITY_PROOF_TIMEOUT_MS);

  it('agrees on structural acceptance for every living valid and invalid example', () => {
    if (!pythonAvailable) return;
    const cases = contracts.flatMap((contract) => [
      ...contract.examples.valid.map((request, index) => ({
        name: `${contract.id} valid[${index}]`,
        skill: contract.id,
        request,
      })),
      ...contract.examples.invalid.map((example, index) => ({
        name: `${contract.id} invalid[${index}]`,
        skill: contract.id,
        request: example.request,
      })),
    ]);
    const ts = cases.map(({ skill, request }) => validateStructure(request, skill).ok);
    const py = pythonStructureValid(cases);
    cases.forEach(({ name }, index) => {
      expect(py[index], `structural cross-language mismatch for ${name}`).toBe(ts[index]);
    });
  }, PARITY_PROOF_TIMEOUT_MS);

  it('agrees that a forged caller conclusion and a unit alias are rejected', () => {
    if (!pythonAvailable) return;

    const base = contracts.find((c) => c.examples.valid.length > 0)!;
    const forged = { ...structuredClone(base.examples.valid[0]), validation: { forged: true } };

    // Both implementations reject a forged conclusion.
    expect(validateRequestValue(forged).ok).toBe(false);
    expect(pythonValid([forged])[0]).toBe(false);

    // Both implementations reject a unit alias where one appears in an invalid example.
    const aliasCase = contracts
      .flatMap((c) => c.examples.invalid)
      .find((e) => e.expectedCode === 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL');
    if (aliasCase) {
      expect(validateRequestValue(aliasCase.request).ok).toBe(false);
      expect(pythonValid([aliasCase.request])[0]).toBe(false);
    }
  }, PARITY_PROOF_TIMEOUT_MS);

  it('assigns the PSTH unit-alias refusal to one canonical-code owner in both runtimes', () => {
    if (!pythonAvailable) return;
    const contract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!contract) throw new Error('neuro.psth contract not found');
    const alias = contract.examples.invalid.find(
      ({ expectedCode }) => expectedCode === 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
    );
    if (!alias) throw new Error('neuro.psth unit-alias vector not found');

    const typescript = validateRequestValue(alias.request);
    expect(typescript.ok).toBe(false);
    expect(typescript.ok ? [] : typescript.errors.map(({ code }) => code)).toEqual([
      'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
    ]);
    expect(pythonErrorCodes([alias.request])).toEqual([
      ['SCIENCE_UNIT_ALIAS_NOT_CANONICAL'],
    ]);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('closes canonical, alias, unknown, and dimension decisions over every unitCode property shape', () => {
    if (!pythonAvailable) return;
    const fields = [
      {
        name: 'ordinary quantity unit',
        skill: 'neuro.psth',
        path: ['data', 'eventTimes', 'unit'],
        canonical: 'ms',
        alias: 'milliseconds',
      },
      {
        name: 'scalar alignmentUnit',
        skill: 'neuro.psth',
        path: ['data', 'alignmentUnit'],
        canonical: 'ms',
        alias: 'milliseconds',
        wrongDimension: 'mV',
      },
      {
        name: 'scalar valueUnit',
        skill: 'neuro.analog_trace',
        path: ['parameters', 'valueUnit'],
        canonical: 'mV',
        alias: 'millivolts',
        wrongDimension: 'ms',
      },
    ] as const;

    const requestWith = (
      skill: string,
      propertyPath: readonly string[],
      value: string,
    ): Record<string, unknown> => {
      const contract = contracts.find(({ id }) => id === skill);
      if (!contract) throw new Error(`${skill} contract not found`);
      const request = structuredClone(contract.examples.valid[0]);
      let target: Record<string, unknown> = request;
      for (const segment of propertyPath.slice(0, -1)) {
        target = target[segment] as Record<string, unknown>;
      }
      target[propertyPath[propertyPath.length - 1]] = value;
      return request;
    };
    const tsDiagnostics = (request: Record<string, unknown>) => {
      const result = validateRequestValue(request);
      return result.ok
        ? []
        : result.errors.map(({ code, stage, instancePath }) => ({ code, stage, instancePath }));
    };

    for (const field of fields) {
      const path = `/${field.path.join('/')}`;
      const canonical = requestWith(field.skill, field.path, field.canonical);
      expect(tsDiagnostics(canonical), `${field.name}: canonical TS`).toEqual([]);
      expect(pythonDiagnostics([canonical]), `${field.name}: canonical Python`).toEqual([[]]);

      const alias = requestWith(field.skill, field.path, field.alias);
      const aliasExpected = [{
        code: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
        stage: 'science',
        instancePath: path,
      }];
      expect(tsDiagnostics(alias), `${field.name}: alias TS`).toEqual(aliasExpected);
      expect(pythonDiagnostics([alias]), `${field.name}: alias Python`).toEqual([aliasExpected]);

      const unknown = requestWith(field.skill, field.path, 'not-a-unit');
      const unknownExpected = [{
        code: 'SCHEMA_ENUM_MISMATCH',
        stage: 'structural',
        instancePath: path,
      }];
      expect(tsDiagnostics(unknown), `${field.name}: unknown TS`).toEqual(unknownExpected);
      expect(pythonDiagnostics([unknown]), `${field.name}: unknown Python`).toEqual([unknownExpected]);

      if ('wrongDimension' in field) {
        const wrongDimension = requestWith(field.skill, field.path, field.wrongDimension);
        const dimensionExpected = [{
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: path,
        }];
        expect(
          tsDiagnostics(wrongDimension),
          `${field.name}: canonical wrong dimension TS`,
        ).toEqual(dimensionExpected);
        expect(
          pythonDiagnostics([wrongDimension]),
          `${field.name}: canonical wrong dimension Python`,
        ).toEqual([dimensionExpected]);
      }
    }
  }, PARITY_PROOF_TIMEOUT_MS);

  it('keeps every living unit-code alias and unknown mutation total in both runtimes', () => {
    if (!pythonAvailable) return;

    const aliasesByCanonical = new Map<string, string[]>();
    for (const [alias, canonical] of Object.entries(UNIT_ALIASES)) {
      const aliases = aliasesByCanonical.get(canonical) ?? [];
      aliases.push(alias);
      aliasesByCanonical.set(canonical, aliases);
    }

    const cases: Array<{
      readonly name: string;
      readonly request: Record<string, unknown>;
      readonly instancePath: string;
    }> = [];
    for (const contract of contracts) {
      for (const [exampleIndex, living] of contract.examples.valid.entries()) {
        for (const occurrence of collectLivingUnitOccurrences(living)) {
          const alias = aliasesByCanonical.get(occurrence.unit)?.find(
            (candidate) => candidate.length > 0,
          );
          const mutations = [
            { kind: 'unknown', value: 'cortexel:not-a-unit' },
            ...(alias === undefined ? [] : [{ kind: 'alias', value: alias }]),
          ];
          for (const mutation of mutations) {
            const request = structuredClone(living) as Record<string, any>;
            replaceLivingValue(request, occurrence.path, mutation.value);
            cases.push({
              name:
                `${contract.id} valid[${exampleIndex}] ${instancePointer(occurrence.path)} ` +
                `${occurrence.unit} -> ${mutation.value} (${mutation.kind})`,
              request,
              instancePath: instancePointer(occurrence.path),
            });
          }
        }
      }
    }

    // Running one independent Python batch is also the no-throw proof: an uncaught
    // KeyError/TypeError at any specialized semantic rule terminates the subprocess
    // and fails this test instead of being mistaken for an ordinary rejection.
    const pythonResults = pythonDiagnostics(cases.map(({ request }) => request));
    const canonicalOwnerCodes = new Set([
      'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
      'SCHEMA_ENUM_MISMATCH',
    ]);

    cases.forEach(({ name, request, instancePath }, index) => {
      const typescript = validateRequestValue(request);
      expect(typescript.ok, `${name}: TypeScript accepted a noncanonical code`).toBe(false);
      const typescriptOwned = typescript.ok
        ? []
        : typescript.errors
            .filter((error) =>
              error.instancePath === instancePath && canonicalOwnerCodes.has(error.code))
            .map(({ code, stage, instancePath: at }) => ({ code, stage, instancePath: at }));
      const pythonOwned = pythonResults[index].filter((error) =>
        error.instancePath === instancePath && canonicalOwnerCodes.has(error.code));
      expect(typescriptOwned, `${name}: missing direct TypeScript canonical owner`).toHaveLength(1);
      expect(pythonOwned, `${name}: Python canonical owner diverged`).toEqual(typescriptOwned);
    });
    expect(cases.length).toBeGreaterThan(500);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('agrees on final dimension diagnostics at every living unit location under every canonical code', () => {
    if (!pythonAvailable) return;

    const cases: Array<{
      readonly name: string;
      readonly request: Record<string, unknown>;
    }> = [];
    for (const contract of contracts) {
      for (const [exampleIndex, living] of contract.examples.valid.entries()) {
        for (const occurrence of collectLivingUnitOccurrences(living)) {
          for (const candidate of Object.keys(UNITS)) {
            if (candidate === occurrence.unit) continue;
            const request = structuredClone(living) as Record<string, any>;
            replaceLivingValue(request, occurrence.path, candidate);
            cases.push({
              name:
                `${contract.id} valid[${exampleIndex}] ` +
                `${instancePointer(occurrence.path)} ${occurrence.unit} -> ${candidate}`,
              request,
            });
          }
        }
      }
    }

    // Python remains a partial semantic reader, so compare only the unit-dimension
    // subset it claims to implement. Use the final TypeScript figure boundary rather
    // than request validation alone: output authority adds exact reciprocal-unit and
    // conversion checks that are just as load-bearing as the request-stage matrix.
    // The code/stage identity is pinned in the focused parity tests above; this
    // finite product compares ordered repair paths for the one selected code. Ask
    // Python to return only a bounded mismatch witness rather than 11k ordinary
    // successes, keeping the subprocess output below the sync-buffer ceiling.
    const expectedPaths = cases.map(({ request }) => {
      const typescript = buildFigure(request);
      return (typescript.ok ? [] : typescript.errors)
        .filter(({ code }) => code === 'SCIENCE_UNIT_DIMENSION_MISMATCH')
        .map(({ instancePath }) => instancePath);
    });
    const comparison = pythonUnitDimensionComparison(cases.map(({ request }, index) => ({
      request,
      expectedPaths: expectedPaths[index],
    })));
    const witnesses = comparison.mismatches.map(({ index, actual }) => ({
      name: cases[index]?.name,
      expected: expectedPaths[index],
      actual,
    }));
    expect(
      comparison.mismatchCount,
      `Python/final-TypeScript unit decisions diverged: ${JSON.stringify(witnesses)}`,
    ).toBe(0);
    expect(cases.length).toBeGreaterThan(10_000);
    expect(cases.length).toBeLessThan(20_000);
  }, EXHAUSTIVE_DIMENSION_PARITY_TIMEOUT_MS);

  it('agrees on contextual dimensions for bare axes, references, panels, and uncertainty', () => {
    if (!pythonAvailable) return;

    const example = (
      skill: string,
      predicate: (request: Record<string, any>) => boolean = () => true,
    ): Record<string, any> => {
      const contract = contracts.find(({ id }) => id === skill);
      const request = contract?.examples.valid.find((candidate) => predicate(candidate as any));
      if (!request) throw new Error(`no ${skill} example satisfies the contextual-unit case`);
      return structuredClone(request) as Record<string, any>;
    };

    const cases: Array<{
      name: string;
      request: Record<string, any>;
      ownedPath?: string;
    }> = [];

    const analogWindow = example('neuro.analog_trace');
    analogWindow.data.window.unit = 'mV';
    cases.push({ name: 'analog time window', request: analogWindow });

    const psthAlignment = example('neuro.psth');
    psthAlignment.data.alignmentUnit = 'mV';
    cases.push({ name: 'PSTH scalar alignment unit', request: psthAlignment });

    const correlogramBins = example('neuro.correlogram', (request) => request.parameters?.bins);
    correlogramBins.parameters.bins.unit = 'mV';
    cases.push({ name: 'correlogram bin axis', request: correlogramBins });

    const weightReference = example('network.synaptic_weight_trace');
    weightReference.data.series[0].initialWeight.quantity.unit = 'pA';
    cases.push({ name: 'opaque weight reference', request: weightReference });

    const weightMembership = example(
      'network.synaptic_weight_trace',
      (request) => request.data?.membership,
    );
    weightMembership.data.membership.unit = 'Hz';
    cases.push({ name: 'weight membership interval', request: weightMembership });

    const weightBins = example(
      'network.weight_distribution',
      (request) => request.data?.mode === 'prebinned',
    );
    weightBins.data.binEdges.unit = 'ms';
    cases.push({ name: 'pre-binned weight axis', request: weightBins });

    const connectionWeightBins = example(
      'network.weight_distribution',
      (request) => request.data?.mode === 'connections',
    );
    connectionWeightBins.parameters.bins.unit = 'ms';
    cases.push({
      name: 'connection-weight bin axis',
      request: connectionWeightBins,
      ownedPath: '/parameters/bins/unit',
    });

    const multisignalPanel = example('neuro.multisignal_trace');
    multisignalPanel.parameters.panels[0].unit = 'mV';
    cases.push({ name: 'multisignal panel binding', request: multisignalPanel });

    const phaseDomain = example('neuro.phase_plane');
    phaseDomain.data.vectorField.domain.x.unit = '1';
    cases.push({ name: 'phase-plane domain binding', request: phaseDomain });

    const analogUncertainty = example('neuro.analog_trace');
    analogUncertainty.data.series = [analogUncertainty.data.series[0]];
    analogUncertainty.data.seriesIds = [analogUncertainty.data.seriesIds[0]];
    const analogLength = analogUncertainty.data.series[0].values.values.length;
    analogUncertainty.parameters.uncertainty = {
      kind: 'standard_deviation',
      unit: 'pA',
      values: Array.from({ length: analogLength }, () => 1),
      sampleCount: Array.from({ length: analogLength }, () => 3),
      basis: 'trials',
    };
    cases.push({ name: 'trace uncertainty binding', request: analogUncertainty });

    const portableDimensionDiagnostics = (
      request: Record<string, unknown>,
      ownedPath?: string,
    ) => {
      const result = validateRequestValue(request);
      return result.ok
        ? []
        : result.errors
            .filter(({ code, instancePath }) =>
              code === 'SCIENCE_UNIT_DIMENSION_MISMATCH' &&
              (ownedPath === undefined || instancePath === ownedPath))
            .map(({ code, stage, instancePath }) => ({ code, stage, instancePath }));
    };
    const typescript = cases.map(({ request, ownedPath }) =>
      portableDimensionDiagnostics(request, ownedPath));
    const pythonResults = pythonDiagnostics(cases.map(({ request }) => request)).map(
      (diagnostics, index) => diagnostics.filter(({ code, instancePath }) =>
        code === 'SCIENCE_UNIT_DIMENSION_MISMATCH' &&
        (cases[index].ownedPath === undefined || instancePath === cases[index].ownedPath)),
    );

    cases.forEach(({ name }, index) => {
      expect(typescript[index], `${name}: TypeScript did not own the relation`).not.toEqual([]);
      expect(pythonResults[index], `${name}: Python/TypeScript contextual divergence`).toEqual(
        typescript[index],
      );
    });
  }, PARITY_PROOF_TIMEOUT_MS);

  it('accepts only the installed response-curve revision in both runtimes', () => {
    if (!pythonAvailable) return;

    const contract = contracts.find(({ id }) => id === 'neuro.response_curve');
    if (!contract) throw new Error('neuro.response_curve contract not found');
    expect(contract.revision).toBe(2);

    const current = structuredClone(contract.examples.valid[0]);
    current.skill = { ...(current.skill as Record<string, unknown>), revision: contract.revision };
    const prior = structuredClone(current);
    prior.skill = { ...(prior.skill as Record<string, unknown>), revision: contract.revision - 1 };

    expect(validateRequestValue(current).ok).toBe(true);
    expect(pythonErrorCodes([current])).toEqual([[]]);

    const tsPrior = validateRequestValue(prior);
    expect(tsPrior.ok).toBe(false);
    if (!tsPrior.ok) {
      expect(tsPrior.errors).toContainEqual(expect.objectContaining({
        code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
        stage: 'identity',
        instancePath: '/skill/revision',
      }));
    }
    expect(pythonErrorCodes([prior])).toEqual([['CONTRACT_SKILL_REVISION_UNSUPPORTED']]);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('keeps spike-window and source-clock diagnostics independent and ordered', () => {
    if (!pythonAvailable) return;

    const contract = contracts.find(({ id }) => id === 'neuro.spike_raster');
    if (!contract) throw new Error('neuro.spike_raster contract not found');
    const invalidWindow = structuredClone(contract.examples.valid[0]) as any;
    invalidWindow.data.window.stop = invalidWindow.data.window.start;
    invalidWindow.source.system = 'nest';
    invalidWindow.source.systemVersion = '3.11';
    delete invalidWindow.source.sourceDigest;

    const badMembershipAndSource = structuredClone(contract.examples.valid[0]) as any;
    badMembershipAndSource.data.eventTimes.values = [
      badMembershipAndSource.data.window.origin + badMembershipAndSource.data.window.stop + 1,
    ];
    badMembershipAndSource.data.eventSenderIds = [badMembershipAndSource.data.recordedSenderIds[0]];
    badMembershipAndSource.source.system = 'nest';

    const cases = [invalidWindow, badMembershipAndSource];
    const ts = cases.map((request) => {
      const result = validateRequestValue(request);
      return result.ok ? [] : result.errors.map((error) => error.code);
    });
    expect(ts).toEqual([
      [
        'SCIENCE_WINDOW_INVALID',
        'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
      ],
      [
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
      ],
    ]);
    expect(pythonErrorCodes(cases)).toEqual(ts);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('matches the detached materialized-value snapshot domain before validation', () => {
    if (!pythonAvailable) return;
    const psthContract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!psthContract) throw new Error('neuro.psth contract not found');
    const prebinned = psthContract.examples.valid.find(
      (request: any) => request.data.mode === 'prebinned',
    ) as any;

    const malformedUnicode = structuredClone(prebinned);
    malformedUnicode.parameters.seriesLabel = '\ud800';

    const dangerousKey = structuredClone(prebinned);
    Object.defineProperty(dangerousKey.parameters, '__proto__', {
      enumerable: true,
      configurable: true,
      value: 'forbidden',
    });

    const overlongString = structuredClone(prebinned);
    overlongString.parameters.seriesLabel = 'x'.repeat(
      getBudgetLimits('standard').jsonStringLength + 1,
    );

    const cases = [malformedUnicode, dangerousKey, overlongString];
    const ts = cases.map(typescriptDiagnosticRecords);
    expect(ts.map((records) => records.map(({ code }) => code))).toEqual([
      ['SNAPSHOT_MALFORMED_STRING'],
      ['SNAPSHOT_DANGEROUS_KEY'],
      ['SNAPSHOT_STRING_TOO_LONG'],
    ]);
    expect(pythonDiagnosticRecords(cases)).toEqual(ts);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('matches the normative diagnostic cap and exact omitted-count receipt', () => {
    if (!pythonAvailable) return;
    const psthContract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!psthContract) throw new Error('neuro.psth contract not found');
    const request = structuredClone(psthContract.examples.valid.find(
      (candidate: any) => candidate.data.mode === 'prebinned',
    )) as any;
    request.data.trialIds = Array(40).fill('same');
    request.data.alignmentTimes = Array(40).fill(0);

    const ts = typescriptDiagnosticRecords(request);
    expect(ts).toHaveLength(getBudgetLimits('standard').errorRecords);
    expect(ts.at(-1)).toEqual({
      code: 'ERROR_LIMIT_REACHED',
      stage: 'internal',
      instancePath: '',
      omittedCount: 8,
    });
    expect(pythonDiagnosticRecords([request])).toEqual([ts]);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('does not truncate failed schema-union branches outside the global diagnostic budget', () => {
    if (!pythonAvailable) return;
    const psthContract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!psthContract) throw new Error('neuro.psth contract not found');
    const request = structuredClone(psthContract.examples.valid.find(
      (candidate: any) => candidate.data.mode === 'prebinned',
    )) as any;
    request.data.counts[1] = 1.5;

    const ts = typescriptDiagnosticRecords(request);
    expect(ts.length).toBeGreaterThan(4);
    expect(ts).toContainEqual({
      code: 'SCHEMA_TYPE_MISMATCH',
      stage: 'structural',
      instancePath: '/data/counts/1',
    });
    expect(pythonDiagnosticRecords([request])).toEqual([ts]);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('orders diagnostic paths by Unicode code points in both runtimes', () => {
    if (!pythonAvailable) return;
    const psthContract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!psthContract) throw new Error('neuro.psth contract not found');
    const request = structuredClone(psthContract.examples.valid.find(
      (candidate: any) => candidate.data.mode === 'prebinned',
    )) as any;
    request.parameters['\ue000'] = 1;
    request.parameters['\u{10000}'] = 2;

    const ts = typescriptDiagnosticRecords(request);
    expect(ts.map(({ instancePath }) => instancePath)).toEqual([
      '/parameters/\ue000',
      '/parameters/\u{10000}',
    ]);
    expect(pythonDiagnosticRecords([request])).toEqual([ts]);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('independently agrees on the portable PSTH count, exposure, and baseline boundary', () => {
    if (!pythonAvailable) return;
    const psthContract = contracts.find(({ id }) => id === 'neuro.psth');
    if (!psthContract) throw new Error('neuro.psth contract not found');
    const prebinned = psthContract.examples.valid.find(
      (request: any) => request.data.mode === 'prebinned',
    ) as any;
    const events = psthContract.examples.valid.find(
      (request: any) => request.data.mode === 'events',
    ) as any;
    const pre = (): any => structuredClone(prebinned);
    const raw = (): any => structuredClone(events);

    const alignmentDimension = pre();
    alignmentDimension.data.alignmentUnit = 'mV';

    const binDimension = pre();
    binDimension.parameters.bins.unit = 'mV';

    const windowDimension = pre();
    windowDimension.data.relativeWindow.unit = 'mV';

    const eventDimension = raw();
    eventDimension.parameters.normalization = 'count';
    delete eventDimension.parameters.senderExposurePolicy;
    eventDimension.data.eventTimes.unit = 'mV';

    const exactCount = pre();
    exactCount.parameters.normalization = 'count';
    delete exactCount.parameters.baseline;
    exactCount.data.rates = {
      kind: 'count', unit: '1', values: [null, 3, 12 - 1e-12, 6],
    };

    const normalizedWithinTolerance = pre();
    delete normalizedWithinTolerance.parameters.baseline;
    normalizedWithinTolerance.data.rates.values[2] = 240 * (1 + 0.5e-12);

    const normalizedOutsideTolerance = pre();
    delete normalizedOutsideTolerance.parameters.baseline;
    normalizedOutsideTolerance.data.rates.values[2] = 240 * (1 + 2e-12);

    const unequalExposure = pre();
    delete unequalExposure.parameters.baseline;
    unequalExposure.parameters.bins = {
      mode: 'edges', unit: 's', edges: [0, 1, 3, 6, 10],
      boundary: '[lo,hi)', finalEdgeInclusive: false,
    };
    unequalExposure.data.relativeWindow = {
      start: 0, stop: 10, unit: 's', boundary: '[start,stop)',
    };
    unequalExposure.data.rates = {
      kind: 'firing_rate', unit: 'Hz', values: [null, 0.5, 0.8, 0.3],
    };

    const denominatorAboveIncluded = pre();
    denominatorAboveIncluded.data.trialDenominators[1] = 6;

    const contradictoryNullMask = pre();
    contradictoryNullMask.data.trialDenominators[0] = 1;

    const zeroBaselineExposure = pre();
    zeroBaselineExposure.parameters.baseline = {
      mode: 'subtract_mean_rate', start: -20, stop: -10,
    };

    const offEdgeBaseline = pre();
    offEdgeBaseline.parameters.baseline.start = -9;

    const missingSenderExposure = raw();
    delete missingSenderExposure.parameters.senderExposurePolicy;

    const widthBudget = raw();
    widthBudget.parameters.normalization = 'count';
    delete widthBudget.parameters.senderExposurePolicy;
    widthBudget.parameters.bins = {
      mode: 'width', unit: 's', width: 1, start: 0, stop: 100001,
      boundary: '[lo,hi)', finalEdgeInclusive: false,
    };
    widthBudget.data.relativeWindow = {
      start: 0, stop: 100001, unit: 's', boundary: '[start,stop)',
    };

    const boundaryMismatch = pre();
    boundaryMismatch.data.relativeWindow.boundary = '[start,stop]';

    const cases = [
      alignmentDimension,
      binDimension,
      windowDimension,
      eventDimension,
      exactCount,
      normalizedWithinTolerance,
      normalizedOutsideTolerance,
      unequalExposure,
      denominatorAboveIncluded,
      contradictoryNullMask,
      zeroBaselineExposure,
      offEdgeBaseline,
      missingSenderExposure,
      widthBudget,
      boundaryMismatch,
    ];
    const ts = cases.map((request) => {
      const result = buildFigure(request);
      return result.ok ? [] : result.errors.map(({ code, stage, instancePath }) => ({
        code,
        stage,
        instancePath,
      }));
    });
    expect(pythonDiagnostics(cases)).toEqual(ts);
  }, PARITY_PROOF_TIMEOUT_MS);

  it('agrees on mathematical JSON integers without JSON.stringify erasing their spelling', () => {
    if (!pythonAvailable) return;

    const responseContract = contracts.find((contract) => contract.id === 'neuro.response_curve');
    if (!responseContract) throw new Error('neuro.response_curve contract not found');
    const meanText = JSON.stringify(responseContract.examples.valid[0]);
    const binnedText = JSON.stringify(responseContract.examples.valid[6]);
    const kernelText = JSON.stringify(responseContract.examples.valid[4]);
    const replace = (text: string, from: string, to: string): string => {
      expect(text).toContain(from);
      return text.replace(from, to);
    };

    const cases = [
      {
        name: 'sender count spelled 1.0',
        text: replace(meanText, '"recordedSenderCount":1', '"recordedSenderCount":1.0'),
        expected: true,
      },
      {
        name: 'sender count spelled 1e0',
        text: replace(meanText, '"recordedSenderCount":1', '"recordedSenderCount":1e0'),
        expected: true,
      },
      {
        name: 'bin count spelled 10.0',
        text: replace(binnedText, '"binCount":10', '"binCount":10.0'),
        expected: true,
      },
      {
        name: 'sample count spelled 1e3',
        text: replace(kernelText, '"sampleCount":1000', '"sampleCount":1e3'),
        expected: true,
      },
      {
        name: 'fractional sender count',
        text: replace(meanText, '"recordedSenderCount":1', '"recordedSenderCount":1.5'),
        expected: false,
      },
    ];

    const ts = cases.map(({ text }) => parseAndValidateRequest(text).ok);
    const py = pythonTextValid(cases.map(({ text }) => text));
    cases.forEach(({ name, expected }, index) => {
      expect(ts[index], `TypeScript decision for ${name}`).toBe(expected);
      expect(py[index], `Python decision for ${name}`).toBe(expected);
      expect(py[index], `raw-text cross-language mismatch for ${name}`).toBe(ts[index]);
    });
  }, PARITY_PROOF_TIMEOUT_MS);

  it('independently agrees on response-rate authority, exact audits, and peak bases', () => {
    if (!pythonAvailable) return;

    const responseContract = contracts.find((contract) => contract.id === 'neuro.response_curve');
    if (!responseContract) throw new Error('neuro.response_curve contract not found');
    const meanBase = responseContract.examples.valid[0] as any;
    const kernelBase = responseContract.examples.valid[4] as any;
    const binnedBase = responseContract.examples.valid[6] as any;
    const rawBinnedBase = responseContract.examples.valid[7] as any;
    const invalidRequest = (curveId: string): unknown => {
      const found = responseContract.examples.invalid.find(({ request }) =>
        (request as any)?.parameters?.curveId === curveId
      );
      if (!found) throw new Error(`response-curve invalid fixture ${curveId} not found`);
      return found.request;
    };

    const rateCase = (
      normalization: 'single_train_rate' | 'total_event_rate' | 'mean_rate_per_recorded_sender',
      recordedSenderCount?: number,
    ): any => {
      const request = structuredClone(meanBase);
      request.data.observations.response.rateNormalization = normalization;
      if (normalization === 'single_train_rate') {
        request.data.eventScope = {
          kind: 'single_train',
          selectionId: 'parity_single_train',
          eventKind: 'spike',
          eventCompleteness: 'complete_for_selection_within_measurement_window',
          poolingOperator: 'identity_single_train',
          ...(recordedSenderCount === undefined ? {} : { recordedSenderCount }),
        };
      } else {
        request.data.eventScope = {
          kind: 'pooled_recorded_senders',
          selectionId: 'parity_sender_population',
          eventKind: 'spike',
          eventCompleteness: 'complete_for_selection_within_measurement_window',
          poolingOperator: 'superpose_selected_sender_trains',
          ...(recordedSenderCount === undefined ? {} : { recordedSenderCount }),
          membershipBinding: { kind: 'cardinality_only' },
        };
      }
      return request;
    };

    const exactAuditCase = (
      normalization: 'total_event_rate' | 'mean_rate_per_recorded_sender',
      value: number,
    ): any => {
      const request = rateCase(normalization, 100);
      request.data.observations.response.audit.eventCounts = Array(6).fill(10);
      request.data.observations.response.values = Array(6).fill(value);
      return request;
    };

    const exponential = structuredClone(kernelBase);
    exponential.data.aggregates.response.basis.shape = 'exponential';
    exponential.data.aggregates.response.basis.kernelForm = 'causal_past';
    exponential.data.aggregates.response.basis.bandwidthDefinition = 'time_constant';
    exponential.data.aggregates.response.basis.support = { kind: 'analytic_infinite' };
    exponential.data.aggregates.response.basis.edgePolicy = 'none';

    const causalEdgeCorrection = structuredClone(exponential);
    causalEdgeCorrection.data.aggregates.response.basis.edgePolicy =
      'renormalize_evaluation_mass';

    const laplace = structuredClone(kernelBase);
    laplace.data.aggregates.response.basis.shape = 'laplace';
    laplace.data.aggregates.response.basis.kernelForm = 'symmetric_laplace';
    laplace.data.aggregates.response.basis.bandwidthDefinition = 'time_constant';
    laplace.data.aggregates.response.basis.support = { kind: 'analytic_infinite' };

    const mislabeledExponential = structuredClone(laplace);
    mislabeledExponential.data.aggregates.response.basis.shape = 'exponential';

    const wrongBinCount = structuredClone(binnedBase);
    wrongBinCount.data.aggregates.response.basis.binCount = 9;

    const wrongRawPeakCount = structuredClone(rawBinnedBase);
    wrongRawPeakCount.data.observations.response.audit.peakBinCounts[0] = 2;

    const wrongRawPeakRate = structuredClone(rawBinnedBase);
    wrongRawPeakRate.data.observations.response.values[0] = 20;

    const nonTimeMeasurementWindow = structuredClone(meanBase);
    nonTimeMeasurementWindow.data.measurementWindow.unit = 'mV';

    const zeroLatency = structuredClone(responseContract.examples.valid[3] as any);
    const zeroLatencyIndex = zeroLatency.data.observations.response.values.findIndex(
      (value: number | null) => value !== null,
    );
    zeroLatency.data.observations.response.values[zeroLatencyIndex] = 0;

    const stimulusOnsetLatency = invalidRequest(
      'stimulus_onset_latency_without_typed_coordinate',
    );
    const negativeLatency = invalidRequest('negative_latency_before_window_start');

    const aggregateOneRound = structuredClone(rawBinnedBase);
    aggregateOneRound.data.mode = 'aggregates';
    delete aggregateOneRound.data.observations;
    aggregateOneRound.data.aggregates = {
      response: {
        method: 'peak_firing_rate',
        kind: 'firing_rate',
        unit: 'Hz',
        rateNormalization: 'single_train_rate',
        values: [
          deriveExactAggregateCountRateInUnit(2n, 1, 3, 100, 'ms', 'Hz'),
        ],
        basis: {
          estimator: 'binned_count',
          binWidth: { kind: 'duration', unit: 'ms', value: 100 },
          binCount: 3,
          origin: 'measurement_window_start',
          boundary: '[start,stop)',
          tilingPolicy: 'cortexel_binary64_uniform_exposure_bins_v1',
          partialBinPolicy: 'refuse',
        },
      },
      sampleCounts: [3],
      excludedCounts: [0],
    };

    const partialBin = structuredClone(binnedBase);
    partialBin.data.aggregates.response.basis.binWidth.value = 120;
    partialBin.data.aggregates.response.basis.binCount = 8;

    const contradictoryAggregateNullMask = structuredClone(binnedBase);
    contradictoryAggregateNullMask.data.aggregates.response.values[0] = null;

    const gaussianCausal = structuredClone(kernelBase);
    gaussianCausal.data.aggregates.response.basis.kernelForm = 'causal_past';
    gaussianCausal.data.aggregates.response.basis.edgePolicy = 'none';

    const wrongSampleCount = structuredClone(kernelBase);
    wrongSampleCount.data.aggregates.response.basis.evaluation.sampleCount = 999;

    const collapsedGrid = structuredClone(kernelBase);
    collapsedGrid.data.measurementWindow.start = 1e16;
    collapsedGrid.data.measurementWindow.stop = 1e16 + 4;
    collapsedGrid.data.aggregates.response.basis.evaluation.step.value = 1;
    collapsedGrid.data.aggregates.response.basis.evaluation.sampleCount = 4;

    const shortenedRawIdentities = structuredClone(rawBinnedBase);
    shortenedRawIdentities.data.observations.conditionIds =
      shortenedRawIdentities.data.observations.conditionIds.slice(0, 1);
    shortenedRawIdentities.data.observations.repeatIds =
      shortenedRawIdentities.data.observations.repeatIds.slice(0, 1);

    const wrongRawAttemptCount = structuredClone(rawBinnedBase);
    wrongRawAttemptCount.data.observations.attemptedCounts = [2];

    const cases: Array<{ name: string; request: unknown; expected: boolean }> = [
      { name: 'single train without sender count', request: rateCase('single_train_rate'), expected: true },
      { name: 'single train with sender count', request: rateCase('single_train_rate', 1), expected: false },
      { name: 'total event rate with sender scope', request: rateCase('total_event_rate', 1), expected: true },
      { name: 'total event rate without sender scope', request: rateCase('total_event_rate'), expected: false },
      { name: 'mean per sender with sender count', request: rateCase('mean_rate_per_recorded_sender', 1), expected: true },
      { name: 'mean per sender without sender count', request: rateCase('mean_rate_per_recorded_sender'), expected: false },
      { name: 'total-rate exact divisor is one', request: exactAuditCase('total_event_rate', 10), expected: true },
      { name: 'mean-rate exact divisor is sender count', request: exactAuditCase('mean_rate_per_recorded_sender', 0.1), expected: true },
      { name: 'total rate cannot use per-sender value', request: exactAuditCase('total_event_rate', 0.1), expected: false },
      { name: 'mean rate cannot use pooled-total value', request: exactAuditCase('mean_rate_per_recorded_sender', 10), expected: false },
      { name: 'valid binned peak basis', request: binnedBase, expected: true },
      { name: 'valid raw binned peak exact-count audit', request: rawBinnedBase, expected: true },
      {
        name: 'raw response identities shorter than response values',
        request: shortenedRawIdentities,
        expected: false,
      },
      {
        name: 'raw response attempted count disagrees with submitted rows',
        request: wrongRawAttemptCount,
        expected: false,
      },
      {
        name: 'raw binned peak missing exact-count audit',
        request: invalidRequest('raw_binned_peak_missing_count_audit'),
        expected: false,
      },
      { name: 'raw binned peak wrong exact count', request: wrongRawPeakCount, expected: false },
      { name: 'raw binned peak wrong rate', request: wrongRawPeakRate, expected: false },
      {
        name: 'response measurement window with a voltage unit',
        request: nonTimeMeasurementWindow,
        expected: false,
      },
      {
        name: 'zero latency at the included measurement-window start',
        request: zeroLatency,
        expected: true,
      },
      {
        name: 'negative latency before the measurement-window start',
        request: negativeLatency,
        expected: false,
      },
      {
        name: 'stimulus-onset latency without typed window coordinate',
        request: stimulusOnsetLatency,
        expected: false,
      },
      {
        name: 'aggregate one-round counterpart of raw exact-100-ms count mean',
        request: aggregateOneRound,
        expected: true,
      },
      { name: 'wrong binned peak count', request: wrongBinCount, expected: false },
      { name: 'partial terminal peak bin', request: partialBin, expected: false },
      {
        name: 'aggregate binned peak response and sample count use different null masks',
        request: contradictoryAggregateNullMask,
        expected: false,
      },
      {
        name: 'raw binned peak off the exact count lattice',
        request: invalidRequest('raw_binned_peak_off_count_lattice'),
        expected: false,
      },
      {
        name: 'aggregate binned peak mean off the exact count lattice',
        request: invalidRequest('aggregate_binned_peak_mean_off_count_lattice'),
        expected: false,
      },
      { name: 'valid Gaussian sampled grid', request: kernelBase, expected: true },
      { name: 'wrong sampled-grid count', request: wrongSampleCount, expected: false },
      { name: 'large-origin collapsed grid', request: collapsedGrid, expected: false },
      { name: 'Gaussian mislabeled causal', request: gaussianCausal, expected: false },
      { name: 'valid causal exponential', request: exponential, expected: true },
      { name: 'singular causal edge renormalization', request: causalEdgeCorrection, expected: false },
      { name: 'valid symmetric Laplace', request: laplace, expected: true },
      { name: 'exponential mislabeled symmetric Laplace', request: mislabeledExponential, expected: false },
    ];

    const ts = cases.map(({ request }) => validateRequestValue(request).ok);
    const py = pythonValid(cases.map(({ request }) => request));
    cases.forEach(({ name, expected }, index) => {
      expect(ts[index], `TypeScript decision for ${name}`).toBe(expected);
      expect(py[index], `Python decision for ${name}`).toBe(expected);
      expect(py[index], `cross-language mismatch for ${name}`).toBe(ts[index]);
    });
  }, PARITY_PROOF_TIMEOUT_MS);
});
