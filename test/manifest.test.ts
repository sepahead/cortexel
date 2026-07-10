import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildManifest,
  serializeManifest,
  type SkillManifestEntry,
  type SkillsManifest,
} from '../scripts/emit-manifest';
import type { ParamValidationConstraint } from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { SCENE_NAMES } from '../core/designLaws';
import Ajv2020 from 'ajv/dist/2020.js';

function portableAjv() {
  const ajv = new Ajv2020({ allErrors: true, useDefaults: true, strict: true });
  ajv.addKeyword({
    keyword: 'x-cortexel-normalize',
    schemaType: 'string',
    validate: () => true,
  });
  ajv.addKeyword({
    keyword: 'x-cortexel-max-utf16-code-units',
    type: 'string',
    schemaType: 'number',
    validate: (limit: number, value: string) => value.length <= limit,
  });
  return ajv;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function resolvePath(root: unknown, rawPath: string): unknown[] {
  const path = rawPath.endsWith('?') ? rawPath.slice(0, -1) : rawPath;
  let values: unknown[] = [root];
  for (const segment of path.split('.')) {
    const next: unknown[] = [];
    for (const value of values) {
      if (segment === '*') {
        const object = asRecord(value);
        if (object) next.push(...Object.values(object));
      } else if (segment.endsWith('[*]')) {
        const object = asRecord(value);
        const collection = object?.[segment.slice(0, -3)];
        if (Array.isArray(collection)) next.push(...collection);
      } else {
        const object = asRecord(value);
        if (object && Object.hasOwn(object, segment)) next.push(object[segment]);
      }
    }
    values = next;
  }
  return values;
}

function sequence(root: unknown, path: string): unknown[] {
  const values = resolvePath(root, path);
  return values.length === 1 && Array.isArray(values[0])
    ? values[0]
    : values;
}

function portableConstraintPass(
  constraint: ParamValidationConstraint,
  params: Record<string, unknown>,
): boolean {
  const sequences = constraint.paths.map((path) => sequence(params, path));
  switch (constraint.kind) {
    case 'equal_length': {
      const present = constraint.paths
        .map((path, index) => ({ path, values: resolvePath(params, path), sequence: sequences[index] }))
        .filter(({ path, values }) => !path.endsWith('?') || values.length > 0)
        .map(({ sequence: values }) => values.length);
      return present.every((length) => length === present[0]);
    }
    case 'each_length_matches': {
      const arrays = resolvePath(params, constraint.paths[0]).filter(Array.isArray) as unknown[][];
      const reference = sequence(params, constraint.paths[constraint.paths.length - 1]);
      return arrays.every((array) => array.length === reference.length);
    }
    case 'monotonic_non_decreasing':
      return sequences.every((values) => values.every(
        (value, index) => index === 0 || (values[index - 1] as number) <= (value as number),
      ));
    case 'non_negative':
      return sequences.every((values) => values.every((value) => (value as number) >= 0));
    case 'property_count':
      return resolvePath(params, constraint.paths[0]).every((value) => {
        const count = Object.keys(asRecord(value) ?? {}).length;
        return (constraint.min === undefined || count >= constraint.min) &&
          (constraint.max === undefined || count <= constraint.max);
      });
    case 'unique_field': {
      const collection = sequence(params, constraint.paths[0]);
      const values = collection.map((value) => asRecord(value)?.[constraint.field!]);
      return new Set(values.map((value) => JSON.stringify(value))).size === values.length;
    }
    case 'unique_tuple': {
      const seen = new Set<string>();
      for (let index = 0; index < (sequences[0]?.length ?? 0); index++) {
        const tuple = sequences.map((values) => values[index]);
        if (
          constraint.symmetricKinds?.includes(String(tuple[tuple.length - 1])) &&
          String(tuple[0]) > String(tuple[1])
        ) {
          [tuple[0], tuple[1]] = [tuple[1], tuple[0]];
        }
        const key = JSON.stringify(tuple);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    }
    case 'references_exist': {
      const allowed = new Set(sequences[sequences.length - 1]);
      return sequences.slice(0, -1).every((values) =>
        values.every((value) => value === null || allowed.has(value)));
    }
    case 'no_self_loops':
      return sequences[0].every((value, index) => value !== sequences[1][index]);
    case 'same_keys': {
      const keySets = constraint.paths.map((path) =>
        Object.keys(asRecord(resolvePath(params, path)[0]) ?? {}).sort().join('\0'));
      return keySets.every((keys) => keys === keySets[0]);
    }
    case 'cartesian_product_length': {
      const axes = resolvePath(params, constraint.paths[0]).filter(Array.isArray) as unknown[][];
      const expected = axes.reduce((product, axis) => product * axis.length, 1);
      return resolvePath(params, constraint.paths[1]).every(
        (value) => Array.isArray(value) && value.length === expected,
      );
    }
    case 'permutation_of_keys': {
      const ordered = sequence(params, constraint.paths[0]).map(String).sort();
      const keys = Object.keys(asRecord(resolvePath(params, constraint.paths[1])[0]) ?? {}).sort();
      return JSON.stringify(ordered) === JSON.stringify(keys);
    }
    case 'endpoint_kinds': {
      const edges = sequence(params, constraint.paths[0]);
      const nodes = sequence(params, constraint.paths[1]);
      const kinds = new Map(nodes.map((node) => {
        const item = asRecord(node)!;
        return [item.id, item.kind];
      }));
      return edges.every((edge) => {
        const item = asRecord(edge)!;
        const expected = constraint.allowedEndpointKinds?.[String(item.kind)];
        return !!expected && kinds.get(item.source) === expected[0] && kinds.get(item.target) === expected[1];
      });
    }
    case 'mapped_value':
      return constraint.allowedValues?.[String(sequences[0][0])] === sequences[1][0];
    case 'conditional_numeric_domain': {
      const domain = constraint.numericDomains?.[String(sequences[0][0])];
      return !!domain && sequences[1].every((value) =>
        typeof value === 'number' &&
        value >= domain.min &&
        (domain.max === undefined || value <= domain.max) &&
        (!domain.integer || Number.isSafeInteger(value)));
    }
    case 'acyclic': {
      const ids = sequences[0];
      const parents = sequences[1];
      const parentById = new Map(ids.map((id, index) => [id, parents[index]]));
      return ids.every((id) => {
        const seen = new Set<unknown>();
        let cursor: unknown = id;
        while (cursor !== null && parentById.has(cursor)) {
          if (seen.has(cursor)) return false;
          seen.add(cursor);
          cursor = parentById.get(cursor);
        }
        return true;
      });
    }
  }
}

function portableInvocationPolicyPass(
  manifest: SkillsManifest,
  skill: SkillManifestEntry,
  payload: Record<string, unknown>,
): boolean {
  if (payload.skill !== skill.id) return false;
  if (skill.scene === null) {
    if (Object.hasOwn(payload, 'scene')) return false;
    if (payload.rendererRoute !== undefined && !skill.rendererRoutes.includes(String(payload.rendererRoute))) {
      return false;
    }
  } else if (payload.scene !== skill.scene || Object.hasOwn(payload, 'rendererRoute')) {
    return false;
  }
  const provenance = asRecord(payload.provenance);
  const declared = asRecord(provenance?.declared_inputs) ?? {};
  if (Object.keys(declared).some((key) => !manifest.provenanceKeys.includes(key))) return false;
  if (skill.requiredProvenanceKeys.some((key) => !Object.hasOwn(declared, key))) return false;
  for (const [key, value] of Object.entries(declared)) {
    const constraint = manifest.provenanceValueConstraints[
      key as keyof typeof manifest.provenanceValueConstraints
    ];
    if (!constraint) return false;
    switch (constraint.kind) {
      case 'positive_finite_number':
        if (!(typeof value === 'number' && Number.isFinite(value) && value > 0)) return false;
        break;
      case 'literal_true':
        if (value !== true) return false;
        break;
      case 'nonnegative_safe_integer_or_nonblank_string':
        if (!(
          (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)) ||
          (typeof value === 'string' && value.trim().length > 0)
        )) return false;
        break;
      case 'string':
        if (typeof value !== 'string') return false;
        break;
      case 'nonblank_string':
        if (!(typeof value === 'string' && value.trim().length > 0)) return false;
        break;
    }
  }
  for (const constraint of skill.provenanceParamConstraints) {
    const actual = declared[constraint.provenanceKey];
    const expected = constraint.kind === 'equals_literal'
      ? constraint.value
      : asRecord(payload.params)?.[constraint.paramKey];
    if (!Object.is(actual, expected)) return false;
  }
  return true;
}

const here = dirname(fileURLToPath(import.meta.url));
const distManifest = join(here, '..', 'dist', 'skills.manifest.json');

describe('skills manifest', () => {
  it('covers every skill id', () => {
    const m = buildManifest();
    expect(m.skills.map((s) => s.id).sort()).toEqual([...NEST_SKILL_IDS].sort());
  });

  it('every non-null scene is a real SceneName', () => {
    for (const s of buildManifest().skills) {
      if (s.scene !== null) expect(SCENE_NAMES).toContain(s.scene as never);
    }
  });

  it('publishes a param schema for every skill, including host-rendered skills', () => {
    for (const skill of buildManifest().skills) {
      expect(skill.paramsJsonSchema, skill.id).toBeDefined();
      expect(
        (skill.paramsJsonSchema?.required as string[] | undefined)?.sort(),
        skill.id,
      ).toEqual([...skill.requiredInputKeys].sort());
      expect(skill.paramsJsonSchema?.additionalProperties, skill.id).toBe(false);
    }
  });

  it('publishes portable constraints for cross-field refinements', () => {
    const byId = Object.fromEntries(buildManifest().skills.map((skill) => [skill.id, skill]));
    expect(byId['nest.spike_raster'].paramConstraints).toContainEqual(
      expect.objectContaining({ kind: 'equal_length' }),
    );
    expect(byId['nest.phase_plane'].paramConstraints).toContainEqual(
      expect.objectContaining({ kind: 'property_count', min: 2, max: 2 }),
    );
    expect(byId['corpus.knowledge_graph'].paramConstraints.map((c) => c.kind)).toEqual(
      expect.arrayContaining([
        'unique_field',
        'unique_tuple',
        'references_exist',
        'no_self_loops',
      ]),
    );
  });

  it('publishes the portable envelope, provenance, normalization, and constraint policies', () => {
    const manifest = buildManifest();
    expect(manifest.jsonLimits.maxDepth).toBeGreaterThan(0);
    expect(manifest.jsonExactnessPolicy.rejectAccessors).toBe(true);
    expect(manifest.jsonExactnessPolicy.duplicateObjectMemberNames).toBe(
      'reject before materialization',
    );
    expect(manifest.provenanceValueConstraints.sampling_interval).toEqual({
      kind: 'positive_finite_number',
    });
    expect(manifest.honestyPolicy.callerCaption).toBe('append_only_unverified');
    expect(manifest.honestyPolicy.callerCaptionLabel).toBe('Caller note (unverified):');
    expect(manifest.honestyPolicy.bidiIsolationRequired).toBe(true);
    expect(manifest.honestyPolicy.templates.synthetic).toMatch(/^Schematic/);
    expect(manifest.paramConstraintLanguage.version).toBe('2');
    expect(manifest.paramConstraintLanguage.semantics.references_exist).toBeDefined();
    expect(manifest.envelopeNormalizationPolicy.missingHonestyFlagsMustUseConservativeDefaults).toBe(true);
    expect(manifest.strictProvenancePolicy.unknownDeclaredInputKeys).toBe('reject');
    expect(manifest.strictInvocationPolicy.rendererRoute).toContain('contract.rendererRoutes');
    expect(manifest.numericModelPolicy.representation).toBe('IEEE-754 binary64');
    expect(manifest.stringNormalizationPolicy.lengthModel).toContain('UTF-16');
    expect(manifest.stringNormalizationPolicy.trimCodePointsHex).toContain('FEFF');
    expect(manifest.stringNormalizationPolicy.trimCodePointsHex).not.toContain('0085');
    const displayPattern = new RegExp(
      manifest.stringNormalizationPolicy.displayStringPattern,
      'u',
    );
    expect(displayPattern.test('paper label')).toBe(true);
    expect(displayPattern.test('paper\u202elabel')).toBe(false);
    expect(manifest.stringNormalizationPolicy.displayStringControls).toContain('bidi');
    expect(manifest.jsonBudgetSemantics.scope).toContain('complete invocation');
    expect(manifest.paletteRegistryPolicy.runtimeExtensionsAllowed).toBe(true);
    expect(manifest.vizSpecJsonSchema).toBeDefined();
    expect(manifest.hostRendererInvocationJsonSchema).toBeDefined();

    const voltage = manifest.skills.find((skill) => skill.id === 'nest.voltage_trace')!;
    const units = (
      voltage.paramsJsonSchema?.properties as Record<string, Record<string, unknown>>
    ).units;
    expect(new RegExp(units.pattern as string, 'u').test('mV')).toBe(true);
    expect(new RegExp(units.pattern as string, 'u').test('mV\u202e')).toBe(false);
    expect(units['x-cortexel-normalize']).toBe('trim');
    expect(manifest.vizSpecJsonSchema.required).toEqual(['scene', 'provenance']);
    const vizParams = (
      manifest.vizSpecJsonSchema.properties as Record<string, Record<string, unknown>>
    ).params;
    expect(vizParams.type).toBe('object');
    const declared = (((
      manifest.vizSpecJsonSchema.properties as Record<string, Record<string, unknown>>
    ).provenance.properties as Record<string, Record<string, unknown>>).declared_inputs);
    expect(declared.type).toBe('object');
    expect(declared.propertyNames).toBeDefined();
    expect(declared.additionalProperties).toBeDefined();
  });

  it('passes every worked envelope and params schema through independent draft-2020-12 validation', () => {
    const manifest = buildManifest();
    const ajv = portableAjv();
    const validateViz = ajv.compile(structuredClone(manifest.vizSpecJsonSchema));
    const validateHost = ajv.compile(
      structuredClone(manifest.hostRendererInvocationJsonSchema),
    );
    for (const skill of manifest.skills) {
      const payload = structuredClone(skill.examplePayload) as Record<string, unknown>;
      const validateParams = ajv.compile(structuredClone(skill.paramsJsonSchema!));
      expect(validateParams(payload.params), `${skill.id}: ${ajv.errorsText(validateParams.errors)}`).toBe(true);
      const validateEnvelope = skill.scene === null ? validateHost : validateViz;
      expect(validateEnvelope(payload), `${skill.id}: ${ajv.errorsText(validateEnvelope.errors)}`).toBe(true);
    }
  });

  it('independently rejects the portable tuple/envelope shapes Zod rejects', () => {
    const manifest = buildManifest();
    const ajv = portableAjv();
    const spatial = manifest.skills.find((skill) => skill.id === 'nest.spatial_2d')!;
    const validateSpatial = ajv.compile(structuredClone(spatial.paramsJsonSchema!));
    expect(validateSpatial({ positions: [[0]] })).toBe(false);
    expect(validateSpatial({ positions: [[0, 1, 2]] })).toBe(false);

    const validateViz = ajv.compile(structuredClone(manifest.vizSpecJsonSchema));
    expect(validateViz({
      scene: 'spike-raster',
      params: 42,
      provenance: { source: 'x' },
    })).toBe(false);
    expect(validateViz({
      scene: 'spike-raster',
      params: {},
      provenance: { source: '😀'.repeat(150) },
    })).toBe(false);
    expect(validateViz({
      scene: 'spike-raster',
      params: {},
      provenance: {
        source: 'x',
        declared_inputs: { population_labels: 'E\u202espoof' },
      },
    })).toBe(false);

    const graph = manifest.skills.find((skill) => skill.id === 'corpus.knowledge_graph')!;
    const validateGraph = ajv.compile(structuredClone(graph.paramsJsonSchema!));
    expect(validateGraph({
      nodes: [{ id: 'p1', kind: 'paper', label: 'Paper\u202espoof' }],
      edges: [],
    })).toBe(false);

    const defaulted: Record<string, unknown> = {
      scene: 'spike-raster',
      provenance: { source: 'x' },
    };
    expect(validateViz(defaulted)).toBe(true);
    expect(defaulted).toMatchObject({
      params: {},
      mode: 'interactive',
      themeMode: 'dark',
      provenance: {
        calibrated_posterior: false,
        advisory_only: true,
        is_paper_local_evidence: false,
        synthetic: false,
      },
    });
  });

  it('executes every portable constraint kind and strict invocation correlation policy', () => {
    const manifest = buildManifest();
    for (const skill of manifest.skills) {
      const payload = structuredClone(skill.examplePayload) as Record<string, unknown>;
      const params = asRecord(payload.params)!;
      expect(portableInvocationPolicyPass(manifest, skill, payload), skill.id).toBe(true);
      for (const constraint of skill.paramConstraints) {
        expect(
          portableConstraintPass(constraint, params),
          `${skill.id}:${constraint.kind}`,
        ).toBe(true);
      }
    }

    const rejectConstraint = (
      skillId: string,
      kind: ParamValidationConstraint['kind'],
      mutate: (params: Record<string, unknown>) => void,
    ) => {
      const skill = manifest.skills.find((entry) => entry.id === skillId)!;
      const constraint = skill.paramConstraints.find((entry) => entry.kind === kind)!;
      const params = structuredClone(
        (skill.examplePayload as { params: Record<string, unknown> }).params,
      );
      mutate(params);
      expect(portableConstraintPass(constraint, params), `${skillId}:${kind}`).toBe(false);
    };

    rejectConstraint('nest.spike_raster', 'equal_length', (params) => {
      params.senders = [];
    });
    rejectConstraint('nest.voltage_trace', 'each_length_matches', (params) => {
      params.series = [[-65]];
    });
    rejectConstraint('nest.correlogram', 'monotonic_non_decreasing', (params) => {
      params.lags_ms = [1, 0, -1];
    });
    rejectConstraint('nest.correlogram', 'mapped_value', (params) => {
      params.correlation_units = 'count';
    });
    rejectConstraint('nest.correlogram', 'conditional_numeric_domain', (params) => {
      params.correlation = [Number.MAX_SAFE_INTEGER + 1];
      params.normalization = 'raw_pair_count';
      params.correlation_units = 'count';
    });
    rejectConstraint('nest.rate_response', 'non_negative', (params) => {
      params.rates_hz = [-1, 0, 1];
    });
    rejectConstraint('nest.phase_plane', 'property_count', (params) => {
      delete (params.grid as Record<string, unknown>).w;
    });
    rejectConstraint('corpus.knowledge_graph', 'unique_field', (params) => {
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[1].id = nodes[0].id;
    });
    rejectConstraint('corpus.knowledge_graph', 'unique_tuple', (params) => {
      const edges = params.edges as Array<Record<string, unknown>>;
      edges.push(structuredClone(edges[0]));
    });
    rejectConstraint('corpus.knowledge_graph', 'references_exist', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0].source = 'missing';
    });
    rejectConstraint('corpus.knowledge_graph', 'no_self_loops', (params) => {
      const edge = (params.edges as Array<Record<string, unknown>>)[0];
      edge.target = edge.source;
    });
    rejectConstraint('nest.phase_plane', 'same_keys', (params) => {
      delete (params.derivatives as Record<string, unknown>).w;
    });
    rejectConstraint('nest.phase_plane', 'cartesian_product_length', (params) => {
      (params.derivatives as Record<string, unknown>).v = [1];
    });
    rejectConstraint('nest.phase_plane', 'permutation_of_keys', (params) => {
      params.axis_order = ['v', 'v'];
    });
    rejectConstraint('corpus.knowledge_graph', 'endpoint_kinds', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0] = {
        source: 'm1', target: 'f1', kind: 'cites',
      };
    });
    rejectConstraint('nest.compartmental_dynamics', 'acyclic', (params) => {
      params.compartments = [
        { id: 'a', parent_id: 'b', values: [1, 1, 1] },
        { id: 'b', parent_id: 'a', values: [1, 1, 1] },
      ];
    });

    const spike = manifest.skills.find((skill) => skill.id === 'nest.spike_raster')!;
    const wrongScene = structuredClone(spike.examplePayload) as Record<string, unknown>;
    wrongScene.scene = 'voltage-trace';
    expect(portableInvocationPolicyPass(manifest, spike, wrongScene)).toBe(false);
    const unknownClaim = structuredClone(spike.examplePayload) as Record<string, unknown>;
    (asRecord(asRecord(unknownClaim.provenance)?.declared_inputs)!).certified = true;
    expect(portableInvocationPolicyPass(manifest, spike, unknownClaim)).toBe(false);

    const host = manifest.skills.find((skill) => skill.id === 'nest.correlogram')!;
    const wrongRoute = structuredClone(host.examplePayload) as Record<string, unknown>;
    wrongRoute.rendererRoute = 'fiber';
    expect(portableInvocationPolicyPass(manifest, host, wrongRoute)).toBe(false);
  });

  it('publishes a complete, self-describing example envelope for every skill', () => {
    for (const skill of buildManifest().skills) {
      expect(skill.examplePayload, skill.id).toMatchObject({ skill: skill.id });
      expect((skill.examplePayload as { params?: unknown }).params).toBeDefined();
      expect((skill.examplePayload as { provenance?: unknown }).provenance).toBeDefined();
    }
  });

  it('committed dist/skills.manifest.json is byte-identical to a fresh emit', () => {
    // Guard against a forgotten rebuild. Skipped pre-build (dist absent).
    if (!existsSync(distManifest)) return;
    const committed = readFileSync(distManifest, 'utf8');
    expect(committed).toBe(serializeManifest());
  });
});
