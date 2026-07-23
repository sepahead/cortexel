import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';

const root = path.resolve(import.meta.dirname, '..');

function readJson(relativePath: string): any {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

const analogContract = readJson('contract/skills/neuro.analog_trace.v1.json') as {
  science: { uncertaintySupport: string[] };
  examples: { valid: Record<string, unknown>[]; invalid: { request: Record<string, unknown> }[] };
};

describe('Artifact 1.0 does not advertise an attestation path it cannot execute', () => {
  it('does not relabel the revision-admitted NEST profile as certified while R049 is unrun', () => {
    const ledger = readJson('docs/release/evidence-ledger.v1.json') as {
      gates: { id: string; status: string }[];
    };
    expect(ledger.gates.find(({ id }) => id === 'R049')?.status).toBe('NOT_RUN');

    const capabilities = readJson('contract/registries/capabilities.v1.json') as {
      capabilities: { id: string; limitations: string[] }[];
    };
    const adapterCapability = capabilities.capabilities.find(
      ({ id }) => id === 'cortexel/adapters/nest',
    );
    expect(adapterCapability).toBeDefined();
    expect(adapterCapability?.limitations.join('\n')).toContain(
      'not upstream-execution or certification evidence',
    );

    const errorRegistry = readJson('contract/registries/error-codes.v1.json') as {
      codes: { code: string; summary: string; correctiveAction: string }[];
    };
    const unsupportedVersion = errorRegistry.codes.find(
      ({ code }) => code === 'ADAPTER_UNSUPPORTED_VERSION',
    );
    expect(unsupportedVersion).toBeDefined();
    expect(`${unsupportedVersion?.summary}\n${unsupportedVersion?.correctiveAction}`).toContain(
      'not evidence that Cortexel executed or certified that upstream version',
    );

    const liveSourceAndDocs = [
      'README.md',
      'CHANGELOG.md',
      'GOVERNANCE.md',
      'MIGRATION.md',
      'ROADMAP.md',
      'SUPPORT.md',
      'contract/README.md',
      'docs/KNOWN_LIMITATIONS.md',
      'docs/PROVENANCE.md',
      'docs/SCOPE.md',
      'docs/SECURITY_MODEL.md',
      'docs/VERSIONING.md',
      'python/README.md',
      'reference/README.md',
      'contract/registries/capabilities.v1.json',
      'contract/registries/error-codes.v1.json',
      'src/adapters/nest/recorders.ts',
      'src/core/semantics/events.ts',
      'test/nestAdapter.test.ts',
      'test/mathUnitHardening.test.ts',
      'test/spikeRasterRevision2.test.ts',
    ].map((relativePath) => readFileSync(path.join(root, relativePath), 'utf8')).join('\n');

    expect(liveSourceAndDocs).not.toMatch(
      /\b(?:certified NEST|certified(?:,)?\s+(?:3\.9|narrow|lossless|upstream|native-millisecond|serialized clock|source declaration|version profile|version matrix|mapping)|uncertified NEST|use a certified version)\b/iu,
    );
  });

  it('keeps credible_interval as diagnostic vocabulary but no stable skill supports it', () => {
    for (const filename of readdirSync(path.join(root, 'contract/skills'))
      .filter((name) => name.endsWith('.v1.json'))) {
      const contract = readJson(`contract/skills/${filename}`) as {
        id: string;
        status: string;
        science: { uncertaintySupport: string[] };
      };
      if (contract.status !== 'stable') continue;
      expect(contract.science.uncertaintySupport, contract.id).not.toContain('credible_interval');
    }
  });

  it('returns the scientific unsupported error without inviting a nonexistent attestation', () => {
    const example = analogContract.examples.invalid.find(
      ({ request }) => (request.parameters as any)?.uncertainty?.kind === 'credible_interval',
    );
    expect(example).toBeDefined();
    if (!example) return;

    const result = validateRequestValue(example.request);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.map(({ code }) => code)).toContain(
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
    );
    expect(result.errors.map(({ code }) => code)).not.toContain(
      'PROVENANCE_ATTESTATION_UNVERIFIED',
    );
    expect(result.errors.map(({ message }) => message).join('\n')).not.toMatch(
      /supply (?:a )?(?:verified|verifiable) attestation/iu,
    );
  });

  it('requires Artifact 1.0 attestations to remain empty', () => {
    const schema = readJson('contract/schemas/figure-artifact.v1.schema.json');
    expect(schema.properties.provenance.properties.attestations).toMatchObject({
      const: [],
    });
  });

  it('always carries the source-authenticity disclosure on a current artifact', () => {
    const result = buildFigure(analogContract.examples.valid[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.disclosures.map(({ id }) => id)).toContain(
      'SOURCE_AUTHENTICITY_UNVERIFIED',
    );
    expect((result.artifact.provenance as any).attestations).toEqual([]);
  });
});
