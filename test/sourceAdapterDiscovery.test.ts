import { spawn } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ADAPTER_IMPLEMENTATIONS_V1 } from '../src/adapters/implementation-inventory.js';
import { nestSpikeRecorderToRaster } from '../src/adapters/nest/index.js';
import {
  isSourceAdapterId,
  lookupSourceAdapter,
  SOURCE_ADAPTER_CATALOG,
  SOURCE_ADAPTER_CATALOG_DIGEST,
  SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
  SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  SOURCE_ADAPTER_DESCRIPTOR_DIGESTS,
  SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
  SOURCE_ADAPTER_IDS,
} from '../src/adapters/source-catalog.js';
import { SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER } from '../src/adapters/source-example.js';
import { canonicalDigest } from '../src/core/canonicalize.js';
import { parseAndValidateRequest } from '../src/core/request.js';

const REPOSITORY = path.resolve(import.meta.dirname, '..');
const CLI_ENTRY = path.join(REPOSITORY, 'src/cli/main.ts');

function runCli(
  args: readonly string[],
  stdin?: string | Buffer,
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

async function withTempDirectory<T>(
  fn: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), 'cortexel-source-cli-'));
  try {
    return await fn(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function artifactPath(output: string): string {
  return output.replace(/\.svg$/u, '.artifact.json');
}

type ExampleBranch = 'positiveInfinity' | 'finiteStop';

function callerOwnedTestCapture(
  branch: ExampleBranch = 'positiveInfinity',
): Record<string, unknown> {
  const example = structuredClone(
    lookupSourceAdapter('nest-spike-recorder')!.examples[branch],
  );
  const input = example.inputTemplate;
  const options = { ...input.options } as Record<string, unknown>;
  // This test fixture explicitly models the post-replacement caller boundary. The
  // shipped guarded object itself is tested separately and must never execute.
  delete options[SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER];
  options.captureAuthority = {
    ...(options.captureAuthority as Record<string, unknown>),
    kind: 'caller_declaration',
  };
  return { exportedStatus: input.exportedStatus, options };
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
    expect(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].example,
    ).toEqual(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].examples
        .positiveInfinity,
    );
    expect(Object.keys(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].examples,
    )).toEqual(['positiveInfinity', 'finiteStop']);
    expect(Object.isFrozen(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].examples.finiteStop,
    )).toBe(true);
    expect(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].implementation,
    ).toMatchObject({
      profile: {
        adapterRevision: 5,
        inputDigestDomain: 'cortexel.nest-spike-recorder-adapter-input.v5',
      },
    });
    expect(
      SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].cli,
    ).toMatchObject({
      command: 'cortexel source adapt nest-spike-recorder <input|->',
      renderCommand:
        'cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json',
      pipeExample:
        'cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg --format json',
      directRenderExample:
        'cortexel source render nest-spike-recorder capture.json --output figure.svg --format json',
    });
    expect(() => {
      (
        SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'] as {
          title: string;
        }
      ).title = 'mutated';
    }).toThrow(TypeError);
  });

  it('binds compact discovery and every complete descriptor independently', () => {
    expect(SOURCE_ADAPTER_CATALOG_DIGEST).toBe(
      canonicalDigest(SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE),
    );
    const mutated = structuredClone(SOURCE_ADAPTER_CATALOG) as unknown as {
      adapters: {
        'nest-spike-recorder': {
          limitations: string[];
        };
      };
    };
    mutated.adapters['nest-spike-recorder'].limitations[0] = 'mutated';
    expect(canonicalDigest({
      domain: SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
      descriptor: mutated.adapters['nest-spike-recorder'],
    })).not.toBe(SOURCE_ADAPTER_DESCRIPTOR_DIGESTS['nest-spike-recorder']);
  });

  it.each(['positiveInfinity', 'finiteStop'] as const)(
    'accepts an explicit caller-owned $branch test capture through the full request gate',
    (branch) => {
      const envelope = callerOwnedTestCapture(branch) as {
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
    },
  );
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
        revision: 5,
        outputSkillId: 'neuro.spike_raster',
        renderCommand:
          'cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json',
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

  it.each(['positiveInfinity', 'finiteStop'] as const)(
    'adapts a caller-owned $branch test capture from strict JSON and pipes it into render',
    async (branch) => {
      const input = `${JSON.stringify(callerOwnedTestCapture(branch))}\n`;
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
    },
  );

  it.each(['positiveInfinity', 'finiteStop'] as const)(
    'directly renders a caller-owned $branch test capture through one metadata dry run',
    async (branch) => {
      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--dry-run',
        '--format',
        'json',
      ], `${JSON.stringify(callerOwnedTestCapture(branch))}\n`);
      expect(result).toMatchObject({ code: 0, stderr: '' });
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({
        protocol: 'cortexel-cli-source-render',
        protocolVersion: 1,
        ok: true,
        dryRun: true,
        skill: 'neuro.spike_raster',
        tableRowsTotal: 3,
        sourceAdapterExecution: {
          id: 'nest-spike-recorder',
          revision: 5,
          catalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
          catalogDigestDomain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
          sourceAuthentication: 'not_performed',
        },
      });
      expect(payload.svgByteLength).toBeGreaterThan(0);
      expect(payload.sourceAdapterExecution.requestDigest)
        .toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(payload.sourceAdapterExecution.artifactDigest)
        .toMatch(/^sha256:[0-9a-f]{64}$/u);
    },
  );

  it.each(['positiveInfinity', 'finiteStop'] as const)(
    'is byte-identical to source adapt then render for the $branch branch',
    async (branch) => {
      await withTempDirectory(async (directory) => {
        const input = `${JSON.stringify(callerOwnedTestCapture(branch))}\n`;
        const adapted = await runCli([
          'source',
          'adapt',
          'nest-spike-recorder',
          '-',
          '--format',
          'json',
        ], input);
        expect(adapted).toMatchObject({ code: 0, stderr: '' });

        const composedOutput = path.join(directory, 'composed.svg');
        const composed = await runCli([
          'render',
          '-',
          '--output',
          composedOutput,
          '--format',
          'json',
        ], adapted.stdout);
        expect(composed).toMatchObject({ code: 0, stderr: '' });

        const directOutput = path.join(directory, 'direct.svg');
        const direct = await runCli([
          'source',
          'render',
          'nest-spike-recorder',
          '-',
          '--output',
          directOutput,
          '--format',
          'json',
        ], input);
        expect(direct).toMatchObject({ code: 0, stderr: '' });

        expect(readFileSync(directOutput))
          .toEqual(readFileSync(composedOutput));
        expect(readFileSync(artifactPath(directOutput)))
          .toEqual(readFileSync(artifactPath(composedOutput)));

        const artifact = JSON.parse(
          readFileSync(artifactPath(directOutput), 'utf8'),
        );
        const resultMetadata = JSON.parse(direct.stdout);
        expect(resultMetadata).toMatchObject({
          protocol: 'cortexel-cli-source-render',
          protocolVersion: 1,
          ok: true,
          dryRun: false,
          skill: 'neuro.spike_raster',
          artifactDigest: artifact.artifactDigest,
          outputs: artifact.outputs,
          tableSidecar: null,
          sourceAdapterExecution: {
            requestDigest: artifact.provenance.requestDigest,
            artifactDigest: artifact.artifactDigest,
            sourceAuthentication: 'not_performed',
          },
        });
      });
    },
    15_000,
  );

  it.each([
    {
      label: 'duplicate member',
      input: Buffer.from(
        '{"exportedStatus":{},"exportedStatus":{},"options":{}}',
        'utf8',
      ),
      expectedCode: 'JSON_DUPLICATE_KEY',
    },
    {
      label: 'UTF-8 BOM',
      input: Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('{}', 'utf8'),
      ]),
      expectedCode: 'JSON_BOM_NOT_ALLOWED',
    },
    {
      label: 'malformed UTF-8',
      input: Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]),
      expectedCode: 'JSON_INVALID_UNICODE',
    },
  ])(
    'rejects $label at the direct raw source boundary',
    async ({ input, expectedCode }) => {
      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--dry-run',
        '--format',
        'json',
      ], input);
      expect(result.code).toBe(3);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr).errors)
        .toContainEqual(expect.objectContaining({ code: expectedCode }));
      expectSafeBoundedDiagnostic(result.stderr);
    },
  );

  it('resolves adapter identity before touching the selected input', async () => {
    const missing = path.join(
      tmpdir(),
      'cortexel-source-input-that-must-not-exist.json',
    );
    const unknown = await runCli([
      'source',
      'render',
      'nest-multimeter',
      missing,
      '--dry-run',
      '--format',
      'json',
    ]);
    expect(unknown.code).toBe(2);
    expect(unknown.stdout).toBe('');
    expect(JSON.parse(unknown.stderr).error.code)
      .toBe('CLI_UNKNOWN_SOURCE_ADAPTER');
    expect(unknown.stderr).not.toContain('input_io');

    const known = await runCli([
      'source',
      'render',
      'nest-spike-recorder',
      missing,
      '--dry-run',
      '--format',
      'json',
    ]);
    expect(known.code).toBe(7);
    expect(known.stdout).toBe('');
    expect(JSON.parse(known.stderr).cliError.kind).toBe('input_io');
    expect(known.stderr).not.toContain(missing);
  });

  it.each([
    ['missing output', []],
    ['dry run plus output', ['--dry-run', '--output', 'figure.svg']],
    ['dry run plus force', ['--dry-run', '--force']],
    ['invalid extension', ['--output', 'figure.png']],
    ['duplicate flag', ['--dry-run', '--dry-run']],
    ['duplicate option', ['--output', 'first.svg', '--output', 'second.svg']],
    ['unknown option', ['--dry-run', '--url', 'https://example.invalid']],
  ] as const)(
    'rejects %s before touching source input',
    async (_label, suffix) => {
      const missing = path.join(
        tmpdir(),
        'cortexel-source-grammar-input-that-must-not-exist.json',
      );
      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        missing,
        ...suffix,
      ]);
      expect(result.code).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('usage error');
      expect(result.stderr).not.toContain('I/O error');
      expect(result.stderr).not.toContain(missing);
    },
  );

  it('preserves adapter failure exit 5 without publishing any output', async () => {
    await withTempDirectory(async (directory) => {
      const invalid = callerOwnedTestCapture() as {
        exportedStatus: Record<string, unknown>;
      };
      invalid.exportedStatus.record_to = 'ascii';
      const output = path.join(directory, 'figure.svg');
      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--output',
        output,
        '--format',
        'json',
      ], JSON.stringify(invalid));
      expect(result.code).toBe(5);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr).errors)
        .toContainEqual(expect.objectContaining({
          code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        }));
      expect(existsSync(output)).toBe(false);
      expect(existsSync(artifactPath(output))).toBe(false);
    });
  });

  it('preserves render-budget refusal without publishing partial output', async () => {
    await withTempDirectory(async (directory) => {
      const oversized = callerOwnedTestCapture('finiteStop') as {
        exportedStatus: {
          n_events: number;
          events: { senders: number[]; times: number[] };
        };
      };
      oversized.exportedStatus.n_events = 501;
      oversized.exportedStatus.events = {
        senders: Array.from({ length: 501 }, () => 1),
        times: Array.from({ length: 501 }, () => 1),
      };
      const output = path.join(directory, 'figure.svg');
      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--output',
        output,
        '--format',
        'json',
      ], JSON.stringify(oversized));
      expect(result.code).toBe(6);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr).errors)
        .toContainEqual(expect.objectContaining({
          code: 'RESOURCE_COMPACTION_UNAVAILABLE',
        }));
      expect(existsSync(output)).toBe(false);
      expect(existsSync(artifactPath(output))).toBe(false);
    });
  });

  it('uses the shared publication boundary for occupancy and stale locks', async () => {
    await withTempDirectory(async (directory) => {
      const input = `${JSON.stringify(callerOwnedTestCapture('finiteStop'))}\n`;
      const occupiedOutput = path.join(directory, 'occupied.svg');
      writeFileSync(occupiedOutput, 'sentinel-svg', 'utf8');
      const occupied = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--output',
        occupiedOutput,
        '--format',
        'json',
      ], input);
      expect(occupied.code).toBe(7);
      expect(occupied.stdout).toBe('');
      expect(JSON.parse(occupied.stderr).cliError.kind).toBe('output_io');
      expect(readFileSync(occupiedOutput, 'utf8')).toBe('sentinel-svg');
      expect(existsSync(artifactPath(occupiedOutput))).toBe(false);

      const lockedOutput = path.join(directory, 'locked.svg');
      const lock = path.join(directory, '.cortexel.figure-emission.lock');
      writeFileSync(lock, 'held', { flag: 'wx', mode: 0o600 });
      const locked = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--output',
        lockedOutput,
        '--format',
        'json',
      ], input);
      expect(locked.code).toBe(7);
      expect(locked.stdout).toBe('');
      expect(JSON.parse(locked.stderr).cliError.kind).toBe('output_io');
      expect(readFileSync(lock, 'utf8')).toBe('held');
      expect(existsSync(lockedOutput)).toBe(false);
      expect(existsSync(artifactPath(lockedOutput))).toBe(false);
    });
  });

  it('force-replaces output symlink entries without touching their targets', async () => {
    await withTempDirectory(async (directory) => {
      const input = `${JSON.stringify(callerOwnedTestCapture('finiteStop'))}\n`;
      const output = path.join(directory, 'figure.svg');
      const artifact = artifactPath(output);
      const svgTarget = path.join(directory, 'outside-svg-target');
      const artifactTarget = path.join(directory, 'outside-artifact-target');
      writeFileSync(svgTarget, 'sentinel-svg', 'utf8');
      writeFileSync(artifactTarget, 'sentinel-artifact', 'utf8');
      symlinkSync(svgTarget, output);
      symlinkSync(artifactTarget, artifact);

      const result = await runCli([
        'source',
        'render',
        'nest-spike-recorder',
        '-',
        '--output',
        output,
        '--force',
        '--format',
        'json',
      ], input);
      expect(result).toMatchObject({ code: 0, stderr: '' });
      expect(lstatSync(output).isSymbolicLink()).toBe(false);
      expect(lstatSync(artifact).isSymbolicLink()).toBe(false);
      expect(readFileSync(svgTarget, 'utf8')).toBe('sentinel-svg');
      expect(readFileSync(artifactTarget, 'utf8')).toBe('sentinel-artifact');
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
      ...callerOwnedTestCapture(),
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
    const invalid = callerOwnedTestCapture() as {
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
