import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { canonicalDigest, canonicalDigestExcluding } from '../src/core/canonicalize.js';
import { sha256Digest } from '../src/core/sha256.js';
import { buildFigure, buildFigureFromJson } from '../src/render/buildFigure.js';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (relative: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(root, relative), 'utf8')) as Record<string, unknown>;

const common = readJson('contract/schemas/common.v1.schema.json');
const registryEnums = readJson('contract/schemas/generated/registry-enums.v1.schema.json');
const validationError = readJson('contract/schemas/validation-error.v1.schema.json');
const requestUnion = readJson('contract/schemas/stable-figure-request-union.v1.schema.json');
const artifactSchema = readJson('contract/schemas/figure-artifact.v1.schema.json');
const spike = readJson('contract/skills/neuro.spike_raster.v1.json') as {
  examples: { valid: Record<string, unknown>[] };
};

let cachedValidator: ValidateFunction | undefined;

function validator(): ValidateFunction {
  if (cachedValidator) return cachedValidator;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
    allowUnionTypes: true,
    validateFormats: false,
  });
  ajv.addSchema(common);
  ajv.addSchema(registryEnums);
  ajv.addSchema(validationError);
  for (const name of readdirSync(path.join(root, 'contract/schemas/skills'))
    .filter((file) => file.endsWith('.request.v1.schema.json'))
    .sort()) {
    ajv.addSchema(readJson(`contract/schemas/skills/${name}`));
  }
  ajv.addSchema(requestUnion);
  cachedValidator = ajv.compile(artifactSchema);
  return cachedValidator;
}

// Schema compilation is module setup, not part of any one assertion's five-second
// budget. The same immutable validator is deliberately reused for every mutation.
validator();

function renderedArtifact(): Extract<ReturnType<typeof buildFigure>, { ok: true }> {
  const result = buildFigure(structuredClone(spike.examples.valid[0]));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected the canonical spike example to render');
  return result;
}

describe('FigureArtifactV1 structural and digest honesty', () => {
  it('validates the emitted artifact and binds only the emitted SVG payload', () => {
    const result = renderedArtifact();
    const validate = validator();
    expect(validate(result.artifact), JSON.stringify(validate.errors)).toBe(true);

    const artifact = result.artifact as {
      buildIdentity: { catalogDigest: string };
      canonicalRequest: Record<string, unknown>;
      provenance: { requestDigest: string };
      accessibility: {
        tablePolicy: string;
        tableBinding: string;
        tableColumns: string[];
        tableRowCount: number;
      };
      outputs: { role: string; sha256: string; byteLength: number }[];
      artifactDigest: string;
    };
    expect(artifact.buildIdentity.catalogDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(artifact.provenance.requestDigest).toBe(canonicalDigest(artifact.canonicalRequest));
    expect(artifact.artifactDigest).toBe(
      canonicalDigestExcluding(artifact as unknown as Record<string, unknown>, 'artifactDigest'),
    );
    expect(artifact.accessibility.tablePolicy).toBe('complete_returned');
    expect(artifact.accessibility.tableBinding).toBe('shape_only');
    expect(artifact.accessibility.tableColumns).toEqual(
      result.table.columns.map((column) => column.key),
    );
    expect(artifact.accessibility.tableRowCount).toBe(result.table.rows.length);
    expect(artifact.outputs).toEqual([
      expect.objectContaining({
        role: 'figure_svg',
        sha256: sha256Digest(result.svg),
        byteLength: Buffer.byteLength(result.svg, 'utf8'),
      }),
    ]);
  });

  it.each(['render', 'accessibility', 'outputs'])(
    'rejects an artifact with no required %s evidence surface',
    (field) => {
      const artifact = structuredClone(renderedArtifact().artifact) as Record<string, unknown>;
      delete artifact[field];
      expect(validator()(artifact)).toBe(false);
    },
  );

  it('rejects an empty output inventory and the impossible artifact-json self-output role', () => {
    const empty = structuredClone(renderedArtifact().artifact) as { outputs: unknown[] };
    empty.outputs = [];
    expect(validator()(empty)).toBe(false);

    const selfBound = structuredClone(renderedArtifact().artifact) as {
      outputs: Record<string, unknown>[];
    };
    selfBound.outputs[0] = { ...selfBound.outputs[0], role: 'artifact_json' };
    expect(validator()(selfBound)).toBe(false);
  });

  it('requires exactly one normative SVG binding with its exact media type', () => {
    const noSvg = structuredClone(renderedArtifact().artifact) as {
      outputs: Record<string, unknown>[];
    };
    noSvg.outputs[0] = {
      ...noSvg.outputs[0],
      role: 'figure_png',
      mediaType: 'image/png',
    };
    expect(validator()(noSvg)).toBe(false);

    const duplicateSvg = structuredClone(renderedArtifact().artifact) as {
      outputs: Record<string, unknown>[];
    };
    duplicateSvg.outputs.push({
      ...duplicateSvg.outputs[0],
      filenameHint: 'duplicate.svg',
    });
    expect(validator()(duplicateSvg)).toBe(false);

    const wrongMediaType = structuredClone(renderedArtifact().artifact) as {
      outputs: Record<string, unknown>[];
    };
    wrongMediaType.outputs[0] = {
      ...wrongMediaType.outputs[0],
      mediaType: 'text/plain',
    };
    expect(validator()(wrongMediaType)).toBe(false);
  });

  it.each(['accepted_compacted', 'rejected'])(
    'rejects the unimplemented budget outcome %s',
    (outcome) => {
      const artifact = structuredClone(renderedArtifact().artifact) as {
        budgetDecision: Record<string, unknown>;
      };
      artifact.budgetDecision.outcome = outcome;
      expect(validator()(artifact)).toBe(false);
    },
  );

  it('rejects producer identities the current writer cannot emit', () => {
    const mutations: readonly [string, (artifact: any) => void][] = [
      ['wrong request contract', (artifact) => {
        artifact.buildIdentity.requestContract = 'cortexel-figure-request/1.1';
      }],
      ['wrong artifact contract', (artifact) => {
        artifact.buildIdentity.artifactContract = 'cortexel-figure-artifact/1.1';
      }],
      ['phantom release', (artifact) => {
        artifact.buildIdentity.release = true;
      }],
      ['phantom source revision', (artifact) => {
        artifact.buildIdentity.sourceRevision = '0123456789abcdef0123456789abcdef01234567';
      }],
      ['non-SemVer package', (artifact) => {
        artifact.buildIdentity.packageVersion = 'latest';
      }],
      ['SemVer numeric prerelease with a leading zero', (artifact) => {
        artifact.buildIdentity.packageVersion = '1.0.0-01';
      }],
    ];
    for (const [label, mutate] of mutations) {
      const artifact = structuredClone(renderedArtifact().artifact);
      mutate(artifact);
      expect(validator()(artifact), label).toBe(false);
    }
  });

  it('accepts only the two truthful input-assurance cross-products', () => {
    const materialized = structuredClone(renderedArtifact().artifact) as any;
    expect(materialized.inputAssurance).toEqual({
      boundary: 'materialized_value',
      duplicateKeys: 'not_observable_after_materialization',
      parserProfile: 'cortexel-safe-snapshot/1.0',
      budgetProfile: 'standard',
    });

    const raw = buildFigureFromJson(JSON.stringify(spike.examples.valid[0]));
    expect(raw.ok).toBe(true);
    if (raw.ok) {
      expect(raw.artifact.inputAssurance).toEqual({
        boundary: 'raw_json_text',
        duplicateKeys: 'rejected_before_materialization',
        parserProfile: 'cortexel-strict-json/1.0',
        budgetProfile: 'standard',
      });
      expect(validator()(raw.artifact)).toBe(true);
    }

    const mismatches: readonly [string, string][] = [
      ['raw_json_text', 'cortexel-safe-snapshot/1.0'],
      ['materialized_value', 'cortexel-strict-json/1.0'],
    ];
    for (const [boundary, parserProfile] of mismatches) {
      const artifact = structuredClone(materialized);
      artifact.inputAssurance.boundary = boundary;
      artifact.inputAssurance.parserProfile = parserProfile;
      expect(validator()(artifact)).toBe(false);
    }

    for (const duplicateKeys of [
      'rejected_before_materialization',
      'not_observable_after_materialization',
    ]) {
      const artifact = structuredClone(materialized);
      artifact.inputAssurance.duplicateKeys = duplicateKeys;
      if (duplicateKeys === 'not_observable_after_materialization') {
        expect(validator()(artifact)).toBe(true);
      } else {
        expect(validator()(artifact)).toBe(false);
      }
    }

    const unknownProfile = structuredClone(materialized);
    unknownProfile.inputAssurance.budgetProfile = 'unbounded';
    expect(validator()(unknownProfile)).toBe(false);
  });

  it('does not duplicate the applied budget profile in budgetDecision', () => {
    const artifact = renderedArtifact().artifact as any;
    expect(artifact.budgetDecision).toEqual({ outcome: 'accepted_full' });

    const duplicated = structuredClone(artifact);
    duplicated.budgetDecision.profileId = artifact.inputAssurance.budgetProfile;
    expect(validator()(duplicated)).toBe(false);
  });

  it('binds renderer revision, theme, and accessibility profile to implemented registries', () => {
    const mutations: readonly [string, (artifact: any) => void][] = [
      ['wrong renderer revision', (artifact) => {
        artifact.render.rendererRevision += 1;
      }],
      ['unknown renderer', (artifact) => {
        artifact.render.rendererId = 'figure.future';
      }],
      ['unknown theme', (artifact) => {
        artifact.render.themeId = 'ultraviolet';
      }],
      ['unknown accessibility profile', (artifact) => {
        artifact.accessibility.profileId = 'future-accessibility';
      }],
      ['unknown accessibility version', (artifact) => {
        artifact.accessibility.profileVersion = '2.0';
      }],
    ];
    for (const [label, mutate] of mutations) {
      const artifact = structuredClone(renderedArtifact().artifact);
      mutate(artifact);
      expect(validator()(artifact), label).toBe(false);
    }
  });

  it('re-checks the embedded canonical request against its closed per-skill schema', () => {
    const artifact = structuredClone(renderedArtifact().artifact) as any;
    artifact.canonicalRequest.data.unclaimedScientificField = 1;
    expect(validator()(artifact)).toBe(false);
  });

  it.each([
    'complete_inline',
    'excerpt_inline_with_complete_sidecar',
    'summary_inline_with_complete_sidecar',
    'reference_only',
  ])('rejects the unavailable table policy %s', (tablePolicy) => {
    const artifact = structuredClone(renderedArtifact().artifact) as {
      accessibility: Record<string, unknown>;
    };
    artifact.accessibility.tablePolicy = tablePolicy;
    expect(validator()(artifact)).toBe(false);
  });

  it.each(['data_table_csv', 'data_table_jsonl', 'provenance_json', 'figure_png'])(
    'rejects the unavailable output role %s',
    (role) => {
      const artifact = structuredClone(renderedArtifact().artifact) as {
        outputs: Record<string, unknown>[];
      };
      artifact.outputs[0] = { ...artifact.outputs[0], role };
      expect(validator()(artifact)).toBe(false);
    },
  );

  it('rejects a build identity that omits the catalog digest', () => {
    const artifact = structuredClone(renderedArtifact().artifact) as {
      buildIdentity: Record<string, unknown>;
    };
    delete artifact.buildIdentity.catalogDigest;
    expect(validator()(artifact)).toBe(false);
  });

  it('requires a nonempty unique ordered table-column inventory', () => {
    const missing = structuredClone(renderedArtifact().artifact) as {
      accessibility: Record<string, unknown>;
    };
    delete missing.accessibility.tableColumns;
    expect(validator()(missing)).toBe(false);

    const duplicate = structuredClone(renderedArtifact().artifact) as {
      accessibility: Record<string, unknown>;
    };
    duplicate.accessibility.tableColumns = ['eventId', 'eventId'];
    expect(validator()(duplicate)).toBe(false);

    const empty = structuredClone(renderedArtifact().artifact) as {
      accessibility: Record<string, unknown>;
    };
    empty.accessibility.tableColumns = [];
    expect(validator()(empty)).toBe(false);
  });

  it('rejects equality-debt and future-only fields rather than reserving them', () => {
    const mutations: readonly [string, (artifact: any) => void][] = [
      ['renderer idSeed', (artifact) => {
        artifact.render.idSeed = `sha256:${'0'.repeat(64)}`;
      }],
      ['budget before-count', (artifact) => {
        artifact.budgetDecision.countBefore = 1;
      }],
      ['inline table count', (artifact) => {
        artifact.accessibility.tableRowsInline = 1;
      }],
      ['legacy provenance inputDigest', (artifact) => {
        artifact.provenance.inputDigest = artifact.provenance.requestDigest;
      }],
      ['unimplemented attestation', (artifact) => {
        artifact.provenance.attestations.push({
          type: 'future-signature',
          issuer: 'caller',
          signatureVerified: true,
          sourceContentVerified: true,
        });
      }],
    ];
    for (const [label, mutate] of mutations) {
      const artifact = structuredClone(renderedArtifact().artifact) as Record<string, unknown>;
      mutate(artifact);
      expect(validator()(artifact), label).toBe(false);
    }
  });

  it('rejects unreachable validation outcomes and zero-byte SVG claims', () => {
    const failed = structuredClone(renderedArtifact().artifact) as {
      validation: { semantic: Record<string, unknown> };
      outputs: Record<string, unknown>[];
    };
    failed.validation.semantic.result = 'failed';
    expect(validator()(failed)).toBe(false);

    const emptySvg = structuredClone(renderedArtifact().artifact) as {
      outputs: Record<string, unknown>[];
    };
    emptySvg.outputs[0].byteLength = 0;
    expect(validator()(emptySvg)).toBe(false);
  });
});
