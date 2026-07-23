import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { traceAxisDimensionCompatible } from '../src/core/semantics/uncertainty.js';
import { unitDimensionMatch } from '../src/core/semantics/units.js';
import { dimensionOf, isQuantityKind } from '../src/core/units.js';
import {
  QUANTITY_KIND_DIMENSIONS,
  UNITS,
} from '../src/generated/registry.js';

interface SkillContract {
  readonly id: string;
  readonly requestSchema: unknown;
  readonly examples: { readonly valid: readonly Record<string, any>[] };
}

interface UnitOccurrence {
  readonly path: readonly (string | number)[];
  readonly owner: Record<string, unknown>;
  readonly unit: string;
  readonly kind?: string;
}

interface DiagnosticOwner {
  readonly code: string;
  readonly validatorId?: string;
}

const CONTRACT_ROOT = path.resolve(import.meta.dirname, '../contract/skills');
const COMMON_SCHEMA = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/schemas/common.v1.schema.json'),
  'utf8',
)) as unknown;
const CONTRACTS = readdirSync(CONTRACT_ROOT)
  .filter((filename) => filename.endsWith('.json'))
  .sort()
  .map((filename) => JSON.parse(
    readFileSync(path.join(CONTRACT_ROOT, filename), 'utf8'),
  ) as SkillContract);

const UNIT_PROPERTIES = new Set(['alignmentUnit', 'unit', 'valueUnit']);
const REPRESENTATIVE_UNIT_BY_DIMENSION = Object.freeze(
  Object.entries(UNITS).reduce<Record<string, string>>((found, [unit, metadata]) => {
    found[metadata.dimension] ??= unit;
    return found;
  }, {}),
);

/**
 * Every living bare time field and its single diagnostic owner at that field.
 *
 * Shared time records deliberately have different owners in different skills. A
 * source-schema inventory alone cannot establish runtime ownership, so this map is
 * the executable bridge from each instantiated path to the validator responsible
 * for rejecting a canonical non-time unit. Downstream derived diagnostics at other
 * paths are outside this ownership relation.
 */
const TIME_BARE_CONTEXT_OWNERS: Readonly<Record<string, DiagnosticOwner>> = Object.freeze({
  'network.delay_distribution:parameters.bins.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match',
  },
  'network.synaptic_weight_trace:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'network.synaptic_weight_trace:data.series.*.recordedInterval.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match',
  },
  'network.synaptic_weight_trace:data.membership.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match',
  },
  'neuro.analog_trace:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.compartment_trace:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.correlogram:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.correlogram:parameters.lagRange.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'correlogram.lag_range_valid',
  },
  'neuro.correlogram:parameters.bins.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'correlogram.lag_range_valid',
  },
  'neuro.correlogram:data.binEdges.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'correlogram.prebinned_axis_consistent',
  },
  'neuro.isi_distribution:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.isi_distribution:parameters.bins.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match',
  },
  'neuro.multisignal_trace:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.multisignal_trace:parameters.normalization.statisticsWindow.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.population_rate:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.population_rate:parameters.bins.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'rate.verify_normalization',
  },
  'neuro.population_rate:data.binEdges.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match',
  },
  'neuro.psth:data.alignmentUnit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'psth.alignment_declared',
  },
  'neuro.psth:data.relativeWindow.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.psth:parameters.bins.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'psth.alignment_declared',
  },
  'neuro.response_curve:data.measurementWindow.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
  'neuro.spike_raster:data.window.unit': {
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'window.valid',
  },
});

const BARE_SCHEMA_UNIT_COVERAGE = Object.freeze({
  'common:/$defs/timeWindow/properties/unit': 'living',
  'common:/$defs/eventTimeWindow/properties/unit': 'living',
  'common:/$defs/binSpec/oneOf/0/properties/unit': 'living',
  'common:/$defs/binSpec/oneOf/1/properties/unit': 'living',
  'common:/$defs/uncertainty/oneOf/1/properties/unit': 'synthetic',
  'common:/$defs/uncertainty/oneOf/2/properties/unit': 'synthetic',
  'common:/$defs/uncertainty/oneOf/3/properties/unit': 'synthetic',
  'common:/$defs/uncertainty/oneOf/4/properties/unit': 'synthetic',
  'network.synaptic_weight_trace:/data/oneOf/0/properties/membership/properties/unit': 'living',
  'network.weight_distribution:/data/oneOf/1/properties/binEdges/properties/unit': 'living',
  'neuro.analog_trace:/parameters/properties/valueUnit': 'living',
  'neuro.correlogram:/data/$defs/binEdges/properties/unit': 'living',
  'neuro.correlogram:/parameters/properties/lagRange/properties/unit': 'living',
  'neuro.correlogram:/parameters/properties/bins/properties/unit': 'living',
  'neuro.multisignal_trace:/parameters/properties/panels/items/properties/unit': 'living',
  'neuro.phase_plane:/data/properties/vectorField/properties/domain/properties/x/properties/unit': 'living',
  'neuro.phase_plane:/data/properties/vectorField/properties/domain/properties/y/properties/unit': 'living',
  'neuro.population_rate:/data/oneOf/1/properties/binEdges/properties/unit': 'living',
  'neuro.psth:/data/oneOf/0/properties/alignmentUnit': 'living',
  'neuro.psth:/data/oneOf/1/properties/alignmentUnit': 'living',
} as const);

const BARE_SCHEMA_PATHS_WITHOUT_LIVING_EXAMPLE = Object.freeze([
  'common:/$defs/uncertainty/oneOf/1/properties/unit',
  'common:/$defs/uncertainty/oneOf/2/properties/unit',
  'common:/$defs/uncertainty/oneOf/3/properties/unit',
  'common:/$defs/uncertainty/oneOf/4/properties/unit',
] as const);

function collectUnitOccurrences(
  value: unknown,
  currentPath: readonly (string | number)[] = [],
  found: UnitOccurrence[] = [],
): UnitOccurrence[] {
  if (value === null || typeof value !== 'object') return found;
  if (!Array.isArray(value)) {
    const owner = value as Record<string, unknown>;
    for (const property of UNIT_PROPERTIES) {
      if (typeof owner[property] !== 'string') continue;
      found.push({
        path: [...currentPath, property],
        owner,
        unit: owner[property],
        ...(typeof owner.kind === 'string' ? { kind: owner.kind } : {}),
      });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (child === null || typeof child !== 'object') continue;
    collectUnitOccurrences(
      child,
      [...currentPath, Array.isArray(value) ? Number(key) : key],
      found,
    );
  }
  return found;
}

function schemaKindIsRegistered(node: unknown): boolean {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return false;
  const schema = node as Record<string, unknown>;
  if (
    typeof schema.$ref === 'string' &&
    schema.$ref.endsWith('#/$defs/quantityKind')
  ) return true;
  if (typeof schema.const === 'string' && isQuantityKind(schema.const)) return true;
  if (
    Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every((candidate) => typeof candidate === 'string' && isQuantityKind(candidate))
  ) return true;
  return ['allOf', 'anyOf', 'oneOf'].some((keyword) =>
    Array.isArray(schema[keyword]) && schema[keyword].some(schemaKindIsRegistered));
}

function collectBareUnitSchemaPaths(
  node: unknown,
  owner: string,
  currentPath: readonly string[] = [],
  found: Set<string> = new Set(),
): Set<string> {
  if (node === null || typeof node !== 'object') return found;
  if (!Array.isArray(node)) {
    const schema = node as Record<string, unknown>;
    const properties = schema.properties;
    if (properties !== null && typeof properties === 'object' && !Array.isArray(properties)) {
      const propertySchemas = properties as Record<string, unknown>;
      for (const [property, propertySchema] of Object.entries(propertySchemas)) {
        const reference = propertySchema !== null && typeof propertySchema === 'object'
          ? (propertySchema as Record<string, unknown>).$ref
          : undefined;
        if (typeof reference !== 'string' || !reference.endsWith('#/$defs/unitCode')) continue;
        if (property === 'unit' && schemaKindIsRegistered(propertySchemas.kind)) continue;
        found.add(`${owner}:/${[...currentPath, 'properties', property].join('/')}`);
      }
    }
  }
  for (const [key, child] of Object.entries(node)) {
    if (child === null || typeof child !== 'object') continue;
    collectBareUnitSchemaPaths(child, owner, [...currentPath, key], found);
  }
  return found;
}

function patternOf(pathSegments: readonly (string | number)[]): string {
  return pathSegments.map((segment) => typeof segment === 'number' ? '*' : segment).join('.');
}

function replaceAt(
  root: Record<string, any>,
  pathSegments: readonly (string | number)[],
  value: unknown,
): void {
  let node: any = root;
  for (const segment of pathSegments.slice(0, -1)) node = node[segment];
  node[pathSegments[pathSegments.length - 1]] = value;
}

function dimensionsOfSeries(series: readonly unknown[]): string[] {
  return [...new Set(series.flatMap((candidate) => {
    const unit = (candidate as any)?.values?.unit;
    const dimension = typeof unit === 'string' ? dimensionOf(unit) : undefined;
    return dimension === undefined ? [] : [dimension];
  }))];
}

function allowedBareDimensions(
  contract: SkillContract,
  request: Record<string, any>,
  occurrence: UnitOccurrence,
): readonly string[] {
  const pattern = patternOf(occurrence.path);
  const key = `${contract.id}:${pattern}`;
  if (key in TIME_BARE_CONTEXT_OWNERS) return ['time'];

  if (key === 'network.weight_distribution:data.binEdges.unit') {
    return QUANTITY_KIND_DIMENSIONS.synaptic_weight;
  }
  if (key === 'network.weight_distribution:parameters.bins.unit') {
    const unit = request.data?.connections?.weights?.unit;
    const dimension = typeof unit === 'string' ? dimensionOf(unit) : undefined;
    if (dimension !== undefined) return [dimension];
  }
  if (key === 'neuro.analog_trace:parameters.valueUnit') {
    return dimensionsOfSeries(request.data?.series ?? []);
  }
  if (key === 'neuro.multisignal_trace:parameters.panels.*.unit') {
    if (request.parameters?.layout === 'normalized_overlay') return ['dimensionless'];
    const panelIndex = occurrence.path[2];
    const panelId = request.parameters?.panels?.[panelIndex as number]?.panelId;
    return dimensionsOfSeries(
      (request.data?.series ?? []).filter((series: any) => series.panelId === panelId),
    );
  }
  if (
    key === 'neuro.phase_plane:data.vectorField.domain.x.unit' ||
    key === 'neuro.phase_plane:data.vectorField.domain.y.unit'
  ) {
    const coordinate = occurrence.path[occurrence.path.length - 2];
    const unit = request.data?.axes?.[coordinate as 'x' | 'y']?.unit;
    const dimension = typeof unit === 'string' ? dimensionOf(unit) : undefined;
    if (dimension !== undefined) return [dimension];
  }
  throw new Error(`unclassified bare unit context ${key}`);
}

function expectedBareOwner(
  contract: SkillContract,
  request: Record<string, any>,
  occurrence: UnitOccurrence,
): DiagnosticOwner {
  const key = `${contract.id}:${patternOf(occurrence.path)}`;
  if (
    key === 'neuro.spike_raster:data.window.unit' &&
    request.data?.window?.kind === 'nest_recording_device_origin_relative'
  ) {
    // This source-clock branch intentionally fixes native serialized NEST time to
    // ms, so its structural literal is stricter than the generic time dimension.
    return { code: 'SCHEMA_ENUM_MISMATCH' };
  }
  const timeOwner = TIME_BARE_CONTEXT_OWNERS[key];
  if (timeOwner !== undefined) return timeOwner;
  if (key === 'network.weight_distribution:data.binEdges.unit') {
    return { code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match' };
  }
  if (key === 'network.weight_distribution:parameters.bins.unit') {
    return { code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match' };
  }
  if (key === 'neuro.analog_trace:parameters.valueUnit') {
    return {
      code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
      validatorId: 'trace.axis_dimension_compatible',
    };
  }
  if (key === 'neuro.multisignal_trace:parameters.panels.*.unit') {
    if (request.parameters?.layout === 'normalized_overlay') {
      return { code: 'SCHEMA_ENUM_MISMATCH' };
    }
    return { code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match' };
  }
  if (
    key === 'neuro.phase_plane:data.vectorField.domain.x.unit' ||
    key === 'neuro.phase_plane:data.vectorField.domain.y.unit'
  ) {
    return { code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match' };
  }
  throw new Error(`unowned bare unit context ${key}`);
}

function instancePointer(pathSegments: readonly (string | number)[]): string {
  return pathSegments
    .map((segment) => `/${String(segment).replace(/~/g, '~0').replace(/\//g, '~1')}`)
    .join('');
}

function expectSingleOwnerAtPath(
  outcome: ReturnType<typeof validateRequestValue>,
  pathSegments: readonly (string | number)[],
  owner: DiagnosticOwner,
  label: string,
): void {
  expect(outcome.ok, label).toBe(false);
  if (outcome.ok) return;
  const at = instancePointer(pathSegments);
  const owned = outcome.errors.filter((error) =>
    error.instancePath === at && error.code === owner.code);
  expect(owned, `${label}: expected one ${owner.code} at ${at}`).toHaveLength(1);
  expect(owned[0]?.validatorId, `${label}: wrong validator owner at ${at}`).toBe(
    owner.validatorId,
  );
  if (owner.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH') {
    expect(
      outcome.errors.filter((error) =>
        error.instancePath === at && error.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH'),
      `${label}: duplicate dimension diagnostics at ${at}`,
    ).toHaveLength(1);
  }
}

function codes(outcome: ReturnType<typeof validateRequestValue>): string[] {
  return outcome.ok ? [] : outcome.errors.map((error) => error.code);
}

describe('unit dimension closure', () => {
  it('classifies every bare unitCode source path as living or synthetically covered', () => {
    const found = collectBareUnitSchemaPaths(COMMON_SCHEMA, 'common');
    for (const contract of CONTRACTS) {
      collectBareUnitSchemaPaths(contract.requestSchema, contract.id, [], found);
    }
    expect([...found].sort()).toEqual(Object.keys(BARE_SCHEMA_UNIT_COVERAGE).sort());
    expect(
      Object.entries(BARE_SCHEMA_UNIT_COVERAGE)
        .filter(([, coverage]) => coverage === 'synthetic')
        .map(([sourcePath]) => sourcePath)
        .sort(),
    ).toEqual([...BARE_SCHEMA_PATHS_WITHOUT_LIVING_EXAMPLE].sort());
  });

  it('implements the quantity-kind matrix exactly for every canonical unit dimension', () => {
    for (const [kind, allowedDimensions] of Object.entries(QUANTITY_KIND_DIMENSIONS)) {
      for (const [dimension, unit] of Object.entries(REPRESENTATIVE_UNIT_BY_DIMENSION)) {
        const errors = unitDimensionMatch({
          request: { data: { kind, unit, value: 1 } },
          skillId: 'test.quantity_dimension_matrix',
        });
        expect(
          errors.some((error) => error.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH'),
          `${kind} with ${unit} (${dimension})`,
        ).toBe(!allowedDimensions.includes(dimension));
      }
    }
  });

  it('refuses aliases, unknowns, and every wrong canonical dimension at every living unit location', () => {
    let visited = 0;
    for (const contract of CONTRACTS) {
      for (const [exampleIndex, request] of contract.examples.valid.entries()) {
        expect(validateRequestValue(request).ok, `${contract.id} valid[${exampleIndex}]`).toBe(true);
        for (const occurrence of collectUnitOccurrences(request)) {
          visited++;
          for (const hostile of ['milliseconds', 'cortexel:not-a-unit']) {
            const candidate = structuredClone(request);
            replaceAt(candidate, occurrence.path, hostile);
            const outcome = validateRequestValue(candidate);
            expect(
              outcome.ok,
              `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} accepted ${hostile}`,
            ).toBe(false);
            if (!outcome.ok) {
              expect(
                outcome.errors.filter((error) =>
                  error.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH'),
                `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} -> ${hostile}: an individually non-canonical unit must not also trigger a relational dimension diagnostic`,
              ).toHaveLength(0);
            }
          }

          const registeredKind = occurrence.kind !== undefined && isQuantityKind(occurrence.kind);
          const allowedDimensions = registeredKind
            ? QUANTITY_KIND_DIMENSIONS[occurrence.kind!]
            : allowedBareDimensions(contract, request, occurrence);
          expect(allowedDimensions.length, `${contract.id}:${patternOf(occurrence.path)}`).toBeGreaterThan(0);

          for (const [dimension, unit] of Object.entries(REPRESENTATIVE_UNIT_BY_DIMENSION)) {
            if (unit === occurrence.unit || allowedDimensions.includes(dimension)) continue;
            const candidate = structuredClone(request);
            replaceAt(candidate, occurrence.path, unit);
            const outcome = validateRequestValue(candidate);
            expect(
              outcome.ok,
              `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} accepted ${unit} (${dimension}); allowed ${allowedDimensions.join(', ')}`,
            ).toBe(false);
            expect(
              codes(outcome).some((code) =>
                code === 'SCIENCE_UNIT_DIMENSION_MISMATCH' ||
                code === 'SCHEMA_VALIDATION_FAILED' ||
                code === 'SCHEMA_ENUM_MISMATCH'),
              `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} did not report either the contextual dimension failure or a stricter structural unit literal`,
            ).toBe(true);
            if (!outcome.ok) {
              const at = instancePointer(occurrence.path);
              const dimensionErrorsAtPath = outcome.errors.filter((error) =>
                error.instancePath === at &&
                error.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH');
              const allDimensionErrors = outcome.errors.filter((error) =>
                error.code === 'SCIENCE_UNIT_DIMENSION_MISMATCH');
              expect(
                allDimensionErrors.length,
                `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} -> ${unit} (${dimension}): an individually invalid carrier produced derivative dimension diagnostics`,
              ).toBeLessThanOrEqual(1);
              if (registeredKind) {
                expect(
                  dimensionErrorsAtPath,
                  `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} -> ${unit} (${dimension}): the quantity-kind owner must report the illegal registered pairing`,
                ).toHaveLength(1);
              }
            }
            if (!registeredKind) {
              expectSingleOwnerAtPath(
                outcome,
                occurrence.path,
                expectedBareOwner(contract, request, occurrence),
                `${contract.id} valid[${exampleIndex}] ${patternOf(occurrence.path)} -> ${unit} (${dimension})`,
              );
            }
          }
        }
      }
    }
    expect(visited).toBeGreaterThan(250);
  }, 30_000);

  it('keeps the deliberate multi-dimensional synaptic-weight vocabulary open', () => {
    const contract = CONTRACTS.find((candidate) => candidate.id === 'network.weight_distribution')!;
    const request = structuredClone(contract.examples.valid.find(
      (candidate) => candidate.data.mode === 'prebinned',
    )!);
    for (const dimension of QUANTITY_KIND_DIMENSIONS.synaptic_weight) {
      const unit = REPRESENTATIVE_UNIT_BY_DIMENSION[dimension];
      request.data.binEdges.unit = unit;
      expect(validateRequestValue(request).ok, `${unit} (${dimension})`).toBe(true);
    }

    const multi = CONTRACTS.find((candidate) => candidate.id === 'neuro.multisignal_trace')!;
    const panelScaleChange = structuredClone(multi.examples.valid[0]);
    panelScaleChange.parameters.panels[0].unit = 'mol/L';
    expect(validateRequestValue(panelScaleChange).ok).toBe(true);

    const opaqueSingle = structuredClone(multi.examples.valid[0]);
    opaqueSingle.data.series = [opaqueSingle.data.series[0]];
    opaqueSingle.parameters.panels = [opaqueSingle.parameters.panels[0]];
    opaqueSingle.data.series[0].values.kind = 'synaptic_weight';
    opaqueSingle.data.series[0].values.unit = 'nest:weight';
    opaqueSingle.parameters.panels[0].unit = 'nest:weight';
    expect(validateRequestValue(opaqueSingle).ok).toBe(true);

    const opaquePair = structuredClone(opaqueSingle);
    opaquePair.data.series.push({
      ...structuredClone(opaquePair.data.series[0]),
      seriesId: 'opaque-weight-2',
      variableId: 'opaque_weight_2',
    });
    expect(codes(validateRequestValue(opaquePair))).toContain(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
    );

    const opaqueNormalized = structuredClone(multi.examples.valid[1]);
    opaqueNormalized.data.series[0].values.kind = 'synaptic_weight';
    opaqueNormalized.data.series[0].values.unit = 'nest:weight';
    expect(codes(validateRequestValue(opaqueNormalized))).toContain(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
    );

    const analog = CONTRACTS.find((candidate) => candidate.id === 'neuro.analog_trace')!;
    const opaqueAnalog = structuredClone(analog.examples.valid[0]);
    opaqueAnalog.data.series = [opaqueAnalog.data.series[0]];
    opaqueAnalog.data.seriesIds = [opaqueAnalog.data.seriesIds[0]];
    opaqueAnalog.data.series[0].values.kind = 'synaptic_weight';
    opaqueAnalog.data.series[0].values.unit = 'nest:weight';
    opaqueAnalog.parameters.valueUnit = 'nest:weight';
    expect(traceAxisDimensionCompatible({
      request: opaqueAnalog,
      skillId: 'neuro.analog_trace',
    })).toEqual([]);

    const opaqueAnalogPair = structuredClone(opaqueAnalog);
    opaqueAnalogPair.data.series.push({
      ...structuredClone(opaqueAnalogPair.data.series[0]),
      seriesId: 'opaque-analog-2',
      label: 'Opaque analog 2',
    });
    opaqueAnalogPair.data.seriesIds.push('opaque-analog-2');
    expect(traceAxisDimensionCompatible({
      request: opaqueAnalogPair,
      skillId: 'neuro.analog_trace',
    }).map((error) => error.code)).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
  });

  it('binds weight time/reference fields, multisignal panels, and every phase carrier before rendering', () => {
    const weight = CONTRACTS.find((candidate) => candidate.id === 'network.synaptic_weight_trace')!;
    const wrongInterval = structuredClone(weight.examples.valid[0]);
    wrongInterval.data.series[0].recordedInterval.unit = '1';
    expect(codes(validateRequestValue(wrongInterval))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');

    const wrongReference = structuredClone(weight.examples.valid[0]);
    wrongReference.data.series[0].initialWeight.quantity.unit = 'pA';
    expect(codes(validateRequestValue(wrongReference))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');

    const membershipExample = weight.examples.valid.find((candidate) => candidate.data.membership)!;
    const wrongMembership = structuredClone(membershipExample);
    wrongMembership.data.membership.unit = 'Hz';
    expect(codes(validateRequestValue(wrongMembership))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');

    const multisignal = CONTRACTS.find((candidate) => candidate.id === 'neuro.multisignal_trace')!;
    const wrongPanel = structuredClone(multisignal.examples.valid[0]);
    wrongPanel.parameters.panels[0].unit = 'mV';
    expect(codes(validateRequestValue(wrongPanel))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');

    const phase = CONTRACTS.find((candidate) => candidate.id === 'neuro.phase_plane')!;
    for (const mutate of [
      (request: any) => { request.data.vectorField.domain.x.unit = '1'; },
      (request: any) => { request.data.axes.y.unit = 'pA'; },
      (request: any) => { request.data.vectorField.y.unit = 'pA'; },
      (request: any) => { request.data.nullclines.y.unit = 'pA'; },
      (request: any) => { request.data.fixedPoints.y.unit = 'pA'; },
    ]) {
      const request = structuredClone(phase.examples.valid[0]);
      mutate(request);
      expect(codes(validateRequestValue(request))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    }
  });

  it('binds optional uncertainty units even though living examples conservatively declare none', () => {
    const analog = CONTRACTS.find((candidate) => candidate.id === 'neuro.analog_trace')!;
    const length = analog.examples.valid[0].data.series[0].values.values.length;
    const values = Array.from({ length }, () => 1);
    const lower = Array.from({ length }, () => -1);
    const upper = Array.from({ length }, () => 1);
    const sampleCount = Array.from({ length }, () => 3);
    const variants = [
      {
        kind: 'standard_deviation', unit: 'pA', values, sampleCount, basis: 'trials',
      },
      {
        kind: 'confidence_interval', unit: 'pA', lower, upper, level: 0.95,
        method: 'bootstrap', coverage: 'pointwise', sampleCount, basis: 'trials',
      },
      {
        kind: 'quantile_interval', unit: 'pA', lower, upper,
        lowerQuantile: 0.1, upperQuantile: 0.9, method: 'empirical',
        sampleCount, basis: 'trials',
      },
      {
        kind: 'ensemble_range', unit: 'pA', lower, upper,
        sampleCount, basis: 'ensemble_members',
      },
    ];
    for (const variant of variants) {
      const request = structuredClone(analog.examples.valid[0]);
      request.parameters.uncertainty = structuredClone(variant);
      const outcome = validateRequestValue(request);
      expectSingleOwnerAtPath(
        outcome,
        ['parameters', 'uncertainty', 'unit'],
        { code: 'SCIENCE_UNIT_DIMENSION_MISMATCH', validatorId: 'unit.dimension_match' },
        `${variant.kind} wrong uncertainty dimension`,
      );

      request.parameters.uncertainty.unit = 'mV';
      expect(validateRequestValue(request).ok, `${variant.kind} matching unit`).toBe(true);
    }

    const multisignal = CONTRACTS.find((candidate) => candidate.id === 'neuro.multisignal_trace')!;
    const perSeries = structuredClone(multisignal.examples.valid[0]);
    const seriesLength = perSeries.data.series[0].values.values.length;
    perSeries.data.series[0].uncertainty = {
      kind: 'standard_error',
      unit: 'mV',
      values: Array.from({ length: seriesLength }, () => 0.1),
      sampleCount: Array.from({ length: seriesLength }, () => 4),
      basis: 'trials',
    };
    expect(codes(validateRequestValue(perSeries))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    perSeries.data.series[0].uncertainty.unit = 'umol/L';
    expect(validateRequestValue(perSeries).ok).toBe(true);

    const weight = CONTRACTS.find((candidate) => candidate.id === 'network.synaptic_weight_trace')!;
    const perWeight = structuredClone(weight.examples.valid[0]);
    const weightLength = perWeight.data.series[0].values.values.length;
    perWeight.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'pA',
      values: Array.from({ length: weightLength }, () => 0.5),
      sampleCount: Array.from({ length: weightLength }, () => 3),
      basis: 'replicates',
    };
    expect(codes(validateRequestValue(perWeight))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    perWeight.data.series[0].uncertainty.unit = 'nest:weight';
    const unsupportedRawWeightUncertainty = validateRequestValue(perWeight);
    expect(unsupportedRawWeightUncertainty.ok).toBe(false);
    expect(codes(unsupportedRawWeightUncertainty)).toContain(
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
    );

    const compartment = CONTRACTS.find((candidate) => candidate.id === 'neuro.compartment_trace')!;
    const figureLevel = structuredClone(compartment.examples.valid[0]);
    const compartmentLength = figureLevel.data.series[0].values.values.length;
    figureLevel.parameters.uncertainty = {
      kind: 'standard_error',
      unit: 'pA',
      values: Array.from({ length: compartmentLength }, () => 0.25),
      sampleCount: Array.from({ length: compartmentLength }, () => 5),
      basis: 'trials',
    };
    expect(codes(validateRequestValue(figureLevel))).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    figureLevel.parameters.uncertainty.unit = 'mV';
    expect(validateRequestValue(figureLevel).ok).toBe(true);
  });
});
