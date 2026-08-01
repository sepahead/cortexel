import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  nestSpikeRecorderToRaster,
  type NestSpikeOptionsInput,
} from '../src/adapters/nest/index.js';
import { lookupSourceAdapter } from '../src/adapters/source-catalog.js';
import {
  classifySourceAdapterExampleEnvelope,
  SOURCE_ADAPTER_EXAMPLE_ACTION,
  SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER,
  SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
  SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
  type SourceAdapterExampleEnvelopeV1,
} from '../src/adapters/source-example.js';

const REPOSITORY = path.resolve(import.meta.dirname, '..');
const CLI_ENTRY = path.join(REPOSITORY, 'src/cli/main.ts');

function sourceExample(): SourceAdapterExampleEnvelopeV1 {
  return structuredClone(
    lookupSourceAdapter('nest-spike-recorder')!.example,
  ) as unknown as SourceAdapterExampleEnvelopeV1;
}

function runCli(
  args: readonly string[],
  stdin?: string,
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [CLI_ENTRY, ...args], {
      cwd: REPOSITORY,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    if (!child.stdout || !child.stderr || (stdin !== undefined && !child.stdin)) {
      reject(new Error('source-example CLI test could not acquire requested pipes'));
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    if (stdin !== undefined) child.stdin!.end(stdin);
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

describe('synthetic source-adapter example provenance', () => {
  it('publishes a versioned template-only envelope with an execution guard', () => {
    const example = sourceExample();
    expect(example).toMatchObject({
      protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
      protocolVersion: SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
      adapter: { id: 'nest-spike-recorder', revision: 5 },
      exampleKind: 'synthetic_fixture',
      execution: 'template_only',
      action: SOURCE_ADAPTER_EXAMPLE_ACTION,
      inputTemplate: {
        options: {
          [SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]: {
            protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
            protocolVersion: SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
            status: 'synthetic_unreplaced',
          },
        },
      },
    });
    expect(classifySourceAdapterExampleEnvelope(example))
      .toEqual({ kind: 'template_only' });
    expect(JSON.stringify(example)).not.toContain('"kind":"caller_declaration"');
  });

  it('classifies the exact outer envelope without reading inputTemplate', () => {
    let reads = 0;
    const value: Record<string, unknown> = {
      protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
      protocolVersion: SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
      adapter: { id: 'nest-spike-recorder', revision: 5 },
      exampleKind: 'synthetic_fixture',
      execution: 'template_only',
      action: SOURCE_ADAPTER_EXAMPLE_ACTION,
    };
    Object.defineProperty(value, 'inputTemplate', {
      enumerable: true,
      get() {
        reads++;
        throw new Error('inputTemplate must remain unread');
      },
    });

    expect(classifySourceAdapterExampleEnvelope(value))
      .toEqual({ kind: 'template_only' });
    expect(reads).toBe(0);
  });

  it('fails closed on malformed or extended example-envelope shapes', () => {
    const malformed = sourceExample() as unknown as Record<string, unknown>;
    malformed.extra = true;
    expect(classifySourceAdapterExampleEnvelope(malformed))
      .toEqual({ kind: 'malformed_example' });

    const wrongVersion = sourceExample() as unknown as Record<string, unknown>;
    wrongVersion.protocolVersion = 2;
    expect(classifySourceAdapterExampleEnvelope(wrongVersion))
      .toEqual({ kind: 'malformed_example' });
  });

  it('never lets the unchanged nested fixture become a simulation request', () => {
    const template = sourceExample().inputTemplate;
    const adapted = nestSpikeRecorderToRaster(
      template.exportedStatus,
      template.options as unknown as NestSpikeOptionsInput,
    );

    expect(adapted.ok).toBe(false);
    if (adapted.ok) {
      expect((adapted.request.source as Record<string, unknown>).kind)
        .not.toBe('simulation');
      return;
    }
    expect(adapted.errors).toContainEqual(expect.objectContaining({
      code: 'ADAPTER_MAPPING_REQUIRED',
      instancePath: `/${SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER}`,
      message: expect.stringContaining('synthetic, template-only'),
    }));
  });

  it('does not let deleting only the generic guard promote fixture authority', () => {
    const template = sourceExample().inputTemplate as unknown as {
      exportedStatus: unknown;
      options: Record<string, unknown>;
    };
    delete template.options[SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER];

    const adapted = nestSpikeRecorderToRaster(
      template.exportedStatus,
      template.options as unknown as NestSpikeOptionsInput,
    );
    expect(adapted.ok).toBe(false);
    if (adapted.ok) {
      expect((adapted.request.source as Record<string, unknown>).kind)
        .not.toBe('simulation');
      return;
    }
    expect(adapted.errors).toContainEqual(expect.objectContaining({
      code: 'ADAPTER_MAPPING_REQUIRED',
      instancePath: '/captureAuthority/kind',
      message: expect.stringContaining('caller declaration'),
    }));
  });

  it.each(['adapt', 'render'] as const)(
    'refuses the unchanged source example at CLI %s before producing output',
    async (operation) => {
      const directory = mkdtempSync(path.join(tmpdir(), 'cortexel-source-example-'));
      const output = path.join(directory, 'figure.svg');
      try {
        const args = operation === 'adapt'
          ? ['source', 'adapt', 'nest-spike-recorder', '-', '--format', 'json']
          : [
              'source',
              'render',
              'nest-spike-recorder',
              '-',
              '--output',
              output,
              '--format',
              'json',
            ];
        const result = await runCli(args, `${JSON.stringify(sourceExample())}\n`);
        expect(result.code).toBe(5);
        expect(result.stdout).toBe('');
        const diagnostic = JSON.parse(result.stderr);
        expect(diagnostic).toMatchObject({
          ok: false,
          errors: [{
            code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
            stage: 'adapter',
            message: expect.stringContaining('not simulator output'),
          }],
        });
        expect(result.stderr)
          .toContain(`options.${SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER}`);
        expect(existsSync(output)).toBe(false);
        expect(existsSync(output.replace(/\.svg$/u, '.artifact.json'))).toBe(false);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('rejects a malformed outer wrapper instead of falling through to dispatch', async () => {
    const malformed = sourceExample() as unknown as Record<string, unknown>;
    malformed.protocolVersion = 2;
    malformed.inputTemplate = null;
    const result = await runCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      '-',
      '--format',
      'json',
    ], `${JSON.stringify(malformed)}\n`);

    expect(result.code).toBe(5);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      errors: [{
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        instancePath: '/protocol',
        message: expect.stringContaining('not the exact closed version-1 shape'),
      }],
    });
  });
});
