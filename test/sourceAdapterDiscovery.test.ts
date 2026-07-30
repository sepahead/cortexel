import { spawn } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ADAPTER_IMPLEMENTATIONS_V1 } from '../src/adapters/implementation-inventory.js';
import { nestSpikeRecorderToRaster } from '../src/adapters/nest/index.js';
import {
  isSourceAdapterId,
  lookupSourceAdapter,
  SOURCE_ADAPTER_CATALOG,
  SOURCE_ADAPTER_CATALOG_DIGEST,
  SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  SOURCE_ADAPTER_IDS,
} from '../src/adapters/source-catalog.js';
import { canonicalDigest } from '../src/core/canonicalize.js';
import { parseAndValidateRequest } from '../src/core/request.js';

const REPOSITORY = path.resolve(import.meta.dirname, '..');
const CLI_ENTRY = path.join(REPOSITORY, 'src/cli/main.ts');

function runCli(
  args: readonly string[],
  stdin?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [CLI_ENTRY, ...args], {
      cwd: REPOSITORY,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    const childStdout = child.stdout;
    const childStderr = child.stderr;
    const childStdin = child.stdin;
    if (!childStdout || !childStderr || (stdin !== undefined && !childStdin)) {
      reject(new Error('source-adapter CLI test did not expose requested pipes'));
      return;
    }
    let stdout = '';
    let stderr = '';
    childStdout.setEncoding('utf8');
    childStderr.setEncoding('utf8');
    childStdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    childStderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    if (stdin !== undefined) childStdin!.end(stdin);
    child.once('error', reject);
    child.once('close', (code) => resolve({
      code: code ?? -1,
      stdout,
      stderr,
    }));
  });
}

function exampleEnvelope(): Record<string, unknown> {
  return structuredClone(
    lookupSourceAdapter('nest-spike-recorder')!.example,
  ) as Record<string, unknown>;
}

function expectSafeBoundedDiagnostic(value: string): void {
  expect(value.length).toBeLessThan(4_000);
  expect(value).not.toMatch(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u,
  );
}

describe('executable source-adapter discovery', () => {
  it('is a closed, immutable registry matching packaged implementation authority', () => {
    expect(SOURCE_ADAPTER_IDS).toEqual(['nest-spike-recorder']);
    expect(Object.keys(SOURCE_ADAPTER_CATALOG.adapters)).toEqual([
      'nest-spike-recorder',
    ]);
    expect(
      ADAPTER_IMPLEMENTATIONS_V1
        .filter(({ implementationAvailability }) =>
          implementationAvailability === 'packaged')
        .map(({ mappingId }) => mappingId),
    ).toEqual(SOURCE_ADAPTER_IDS);

    for (const id of SOURCE_ADAPTER_IDS) {
      expect(isSourceAdapterId(id)).toBe(true);
      expect(lookupSourceAdapter(id)).toBe(
        SOURCE_ADAPTER_CATALOG.adapters[id],
      );
    }
    for (const id of ['', 'nest-multimeter', '__proto__', 'constructor']) {
      expect(isSourceAdapterId(id), id).toBe(false);
      expect(lookupSourceAdapter(id), id).toBeUndefined();
    }

    expect(Object.isFrozen(SOURCE_ADAPTER_CATALOG)).toBe(true);
    expect(Object.isFrozen(SOURCE_ADAPTER_CATALOG.adapters)).toBe(true);
    expect(Object.isFrozen(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].example,
    )).toBe(true);
    expect(() => {
      (
        SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'] as {
          title: string;
        }
      ).title = 'mutated';
    }).toThrow(TypeError);
  });

  it('binds every descriptor byte to a domain-separated catalog digest', () => {
    expect(SOURCE_ADAPTER_CATALOG_DIGEST).toBe(canonicalDigest({
      domain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
      catalog: SOURCE_ADAPTER_CATALOG,
    }));
    const mutated = structuredClone(SOURCE_ADAPTER_CATALOG) as unknown as {
      adapters: {
        'nest-spike-recorder': {
          limitations: string[];
        };
      };
    };
    mutated.adapters['nest-spike-recorder'].limitations[0] = 'mutated';
    expect(canonicalDigest({
      domain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
      catalog: mutated,
    })).not.toBe(SOURCE_ADAPTER_CATALOG_DIGEST);
  });

  it('ships a copyable example accepted by the adapter and full request gate', () => {
    const envelope = exampleEnvelope() as {
      exportedStatus: Parameters<typeof nestSpikeRecorderToRaster>[0];
      options: Parameters<typeof nestSpikeRecorderToRaster>[1];
    };
    const adapted = nestSpikeRecorderToRaster(
      envelope.exportedStatus,
      envelope.options,
    );
    expect(adapted.ok).toBe(true);
    if (!adapted.ok) return;
    const checked = parseAndValidateRequest(JSON.stringify(adapted.request));
    expect(checked.ok).toBe(true);
  });
});

describe('source-adapter CLI', () => {
  it('discovers only executable adapters and returns the full descriptor on demand', async () => {
    const catalog = await runCli(['source', 'catalog', '--json']);
    expect(catalog).toMatchObject({ code: 0, stderr: '' });
    const catalogPayload = JSON.parse(catalog.stdout);
    expect(catalogPayload).toMatchObject({
      protocol: 'cortexel-cli-source-catalog',
      protocolVersion: 1,
      sourceAdapterCatalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
      adapters: [{
        id: 'nest-spike-recorder',
        revision: 3,
        outputSkillId: 'neuro.spike_raster',
      }],
    });

    const described = await runCli([
      'source',
      'describe',
      'nest-spike-recorder',
      '--json',
    ]);
    expect(described).toMatchObject({ code: 0, stderr: '' });
    expect(JSON.parse(described.stdout).adapter).toEqual(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'],
    );
  });

  it('adapts strict JSON from stdin, validates it, and pipes into render', async () => {
    const input = `${JSON.stringify(exampleEnvelope())}\n`;
    const adapted = await runCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      '-',
      '--format',
      'json',
    ], input);
    expect(adapted).toMatchObject({ code: 0, stderr: '' });

    const checked = parseAndValidateRequest(adapted.stdout);
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      expect(checked.request.skillId).toBe('neuro.spike_raster');
      expect(checked.request.inputAssurance.duplicateKeys)
        .toBe('rejected_before_materialization');
    }

    const rendered = await runCli([
      'render',
      '-',
      '--dry-run',
      '--format',
      'json',
    ], adapted.stdout);
    expect(rendered).toMatchObject({ code: 0, stderr: '' });
    expect(JSON.parse(rendered.stdout)).toMatchObject({
      ok: true,
      dryRun: true,
      skill: 'neuro.spike_raster',
    });
  });

  it('rejects duplicate members before materialization', async () => {
    const input =
      '{"exportedStatus":{},"exportedStatus":{},"options":{}}';
    const result = await runCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      '-',
      '--format',
      'json',
    ], input);
    expect(result.code).toBe(3);
    expect(result.stdout).toBe('');
    const payload = JSON.parse(result.stderr);
    expect(payload.errors.map(({ code }: { code: string }) => code))
      .toContain('JSON_DUPLICATE_KEY');
  });

  it('rejects envelope drift, unimplemented mappings, and prototype-shaped ids', async () => {
    const extra = {
      ...exampleEnvelope(),
      ignored: true,
    };
    const extraResult = await runCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      '-',
      '--format',
      'json',
    ], JSON.stringify(extra));
    expect(extraResult.code).toBe(5);
    expect(extraResult.stdout).toBe('');
    expect(JSON.parse(extraResult.stderr).errors[0].code)
      .toBe('ADAPTER_NEST_UNSUPPORTED_SHAPE');

    for (const id of ['nest-multimeter', '__proto__', 'constructor']) {
      const unknown = await runCli([
        'source',
        'describe',
        id,
        '--json',
      ]);
      expect(unknown.code, id).toBe(2);
      expect(unknown.stdout, id).toBe('');
      const payload = JSON.parse(unknown.stderr);
      expect(payload.error.code, id).toBe('CLI_UNKNOWN_SOURCE_ADAPTER');
      expect(payload.error.validSourceAdapterIds, id)
        .toEqual(['nest-spike-recorder']);
      expectSafeBoundedDiagnostic(unknown.stderr);
    }
  });

  it('keeps adapter diagnostics bounded and does not emit a partial request', async () => {
    const invalid = exampleEnvelope() as {
      exportedStatus: Record<string, unknown>;
    };
    invalid.exportedStatus.record_to = 'ascii';
    const result = await runCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      '-',
      '--format',
      'json',
    ], JSON.stringify(invalid));
    expect(result.code).toBe(5);
    expect(result.stdout).toBe('');
    const payload = JSON.parse(result.stderr);
    expect(payload.errors.map(({ code }: { code: string }) => code))
      .toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
    expectSafeBoundedDiagnostic(result.stderr);
  });
});
