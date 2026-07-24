import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { exitCodeForErrors, run } from '../src/cli/main.js';
import { canonicalDigestExcluding, canonicalize } from '../src/core/canonicalize.js';
import type { CortexelError } from '../src/core/errors.js';
import { getBudgetLimits } from '../src/core/limits.js';
import { sha256Digest } from '../src/core/sha256.js';
import {
  ERROR_CODE_META,
  ERROR_STAGES,
  type ErrorCode,
  type ErrorStage,
} from '../src/generated/registry.js';

/**
 * The CLI exit values and argument grammar are stable process contracts. `run` returns
 * the exit value instead of terminating the process, while the direct-execution tests
 * below prove the source entry point drains stdout by assigning process.exitCode.
 */

const REPOSITORY = path.resolve(import.meta.dirname, '..');
const CLI_ENTRY = path.join(REPOSITORY, 'src/cli/main.ts');
const SOURCE_TYPESCRIPT_RUNTIME = 'bun';
const populationRate = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../contract/skills/neuro.population_rate.v1.json'),
    'utf8',
  ),
).examples.valid[0];

function capture(fn: () => number): { code: number; stdout: string; stderr: string } {
  const outChunks: string[] = [];
  const errChunks: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  (process.stdout.write as unknown as (s: string) => boolean) = (s: string) => {
    outChunks.push(s);
    return true;
  };
  (process.stderr.write as unknown as (s: string) => boolean) = (s: string) => {
    errChunks.push(s);
    return true;
  };
  try {
    return { code: fn(), stdout: outChunks.join(''), stderr: errChunks.join('') };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

function withTempDirectory<T>(fn: (directory: string) => T): T {
  const directory = mkdtempSync(path.join(tmpdir(), 'cortexel-cli-'));
  try {
    return fn(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function withTempDirectoryAsync<T>(fn: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), 'cortexel-cli-'));
  try {
    return await fn(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writePopulationRateRequest(directory: string): string {
  const request = path.join(directory, 'request.json');
  writeFileSync(request, `${JSON.stringify(populationRate)}\n`, 'utf8');
  return request;
}

function artifactPath(output: string): string {
  return `${output.replace(/\.svg$/, '')}.artifact.json`;
}

function stagedTempNames(directory: string): string[] {
  return readdirSync(directory).filter((name) => /^\.[0-9a-f]{32}\.cortexel\.tmp$/u.test(name));
}

function emissionLockPath(output: string): string {
  return path.join(path.dirname(output), '.cortexel.figure-emission.lock');
}

function emissionLockNames(directory: string): string[] {
  return readdirSync(directory).filter((name) => name === '.cortexel.figure-emission.lock');
}

function expectBoundedSafeDiagnostic(stderr: string): void {
  expect(stderr.length).toBeLessThan(2_000);
  expect(stderr).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u);
}

function runCli(
  args: readonly string[],
  stdin?: string | Buffer,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(SOURCE_TYPESCRIPT_RUNTIME, [CLI_ENTRY, ...args], {
      cwd: REPOSITORY,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const childStdout = child.stdout;
    const childStderr = child.stderr;
    if (!childStdout || !childStderr) {
      reject(new Error('CLI test process did not expose stdout and stderr pipes'));
      return;
    }
    childStdout.setEncoding('utf8');
    childStderr.setEncoding('utf8');
    childStdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    childStderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    if (stdin !== undefined && child.stdin) child.stdin.end(stdin);
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function assertBoundArtifact(output: string): void {
  const svg = readFileSync(output, 'utf8');
  const artifactText = readFileSync(artifactPath(output), 'utf8');
  const artifact = JSON.parse(artifactText) as {
    artifactDigest: string;
    outputs: { role: string; mediaType: string; sha256: string; byteLength: number }[];
  };
  const svgBinding = artifact.outputs.find((entry) => entry.role === 'figure_svg');
  expect(svg).toMatch(/^<svg/u);
  expect(svgBinding).toEqual(
    expect.objectContaining({
      mediaType: 'image/svg+xml',
      sha256: sha256Digest(svg),
      byteLength: Buffer.byteLength(svg, 'utf8'),
    }),
  );
  expect(artifact.artifactDigest).toBe(
    canonicalDigestExcluding(artifact as unknown as Record<string, unknown>, 'artifactDigest'),
  );
  expect(artifactText).toBe(canonicalize(artifact));
}

describe('cli — identity, catalog, and direct execution', () => {
  it('prints complete identity JSON', () => {
    const { code, stdout, stderr } = capture(() => run(['identity', '--json']));
    expect(code).toBe(0);
    expect(stderr).toBe('');
    const identity = JSON.parse(stdout);
    expect(identity.requestContract).toBe('cortexel-figure-request/1.0');
    expect(identity.contractDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it('lists exactly the 19 stable skills and keeps experimental output explicit', () => {
    const stable = capture(() => run(['catalog', '--json']));
    expect(stable.code).toBe(0);
    expect(JSON.parse(stable.stdout).stable).toHaveLength(19);
    expect(JSON.parse(stable.stdout).experimental).toBeUndefined();

    const all = capture(() => run(['catalog', '--include-experimental', '--json']));
    expect(all.code).toBe(0);
    expect(Array.isArray(JSON.parse(all.stdout).experimental)).toBe(true);
  });

  it('does not execute when imported by a different entry script also named main.ts', () => {
    withTempDirectory((directory) => {
      const importer = path.join(directory, 'main.ts');
      writeFileSync(
        importer,
        `await import(${JSON.stringify(pathToFileURL(CLI_ENTRY).href)});\nprocess.stdout.write('imported\\n');\n`,
        'utf8',
      );
      const result = spawnSync(SOURCE_TYPESCRIPT_RUNTIME, [importer], {
        cwd: REPOSITORY,
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('imported\n');
      expect(result.stderr).toBe('');
    });
  });

  it('uses a precise guard and lets successful direct stdout drain completely', () => {
    const source = readFileSync(CLI_ENTRY, 'utf8');
    expect(source).not.toMatch(/process\.exit\s*\(/u);
    const result = spawnSync(SOURCE_TYPESCRIPT_RUNTIME, [CLI_ENTRY, 'identity', '--json'], {
      cwd: REPOSITORY,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout).artifactContract).toBe('cortexel-figure-artifact/1.0');
    expect(result.stdout.endsWith('\n')).toBe(true);
  });

  it('runs the source entry under a native-ESM TypeScript loader', () => {
    const tsx = path.join(REPOSITORY, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const result = spawnSync('node', [tsx, CLI_ENTRY, 'identity', '--json'], {
      cwd: REPOSITORY,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout).requestContract).toBe('cortexel-figure-request/1.0');
  });

  it('recognizes exact direct execution through an npm-style symlink', () => {
    if (process.platform === 'win32') return;
    withTempDirectory((directory) => {
      const linkedEntry = path.join(directory, 'cortexel');
      symlinkSync(CLI_ENTRY, linkedEntry);
      const result = spawnSync(SOURCE_TYPESCRIPT_RUNTIME, [linkedEntry, 'identity', '--json'], {
        cwd: directory,
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout).release).toBe(false);
    });
  });
});

describe('cli — every command has a closed argv grammar', () => {
  it.each([
    ['identity', '--json', '--json'],
    ['identity', 'extra'],
    ['catalog', '--include-experimental', '--include-experimental'],
    ['catalog', '--unknown'],
    ['validate'],
    ['validate', ''],
    ['validate', 'one', 'two'],
    ['validate', 'input', '--format'],
    ['validate', 'input', '--format', 'text'],
    ['validate', 'input', '--format', 'json', '--format', 'json'],
    ['validate', 'input', '--url', 'https://invalid.example'],
    ['render', 'input'],
    ['render', 'input', '--output'],
    ['render', 'input', '--output', ''],
    ['render', 'input', '--output', 'a.svg', '--output', 'b.svg'],
    ['render', 'input', '--output', 'a.svg', '--force', '--force'],
    ['render', 'input', '--dry-run', '--dry-run'],
    ['render', 'input', '--dry-run', '--output', 'a.svg'],
    ['render', 'input', '--dry-run', '--force'],
    ['render', 'input', '--url', 'https://invalid.example', '--dry-run'],
    ['render', 'one', 'two', '--output', 'a.svg'],
    ['inspect'],
    ['inspect', 'one', 'two'],
    ['inspect', 'input', '--json'],
    ['migrate'],
    ['migrate', 'one', 'two'],
    ['migrate', 'input', '--format'],
    ['migrate', 'input', '--format', 'text'],
    ['migrate', 'input', '--format', 'json'],
    ['help', 'extra'],
  ])('rejects invalid argv: %j', (...argv: string[]) => {
    const result = capture(() => run(argv));
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('usage error:');
    expectBoundedSafeDiagnostic(result.stderr);
  });

  it('consumes --format values as option values regardless of option order', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      for (const argv of [
        ['validate', '--format', 'json', request],
        ['validate', request, '--format', 'json'],
      ]) {
        const result = capture(() => run(argv));
        expect(result.code).toBe(0);
        expect(JSON.parse(result.stdout).ok).toBe(true);
        expect(result.stderr).toBe('');
      }
    });
  });

  it('treats an option-like token after -- as the one positional input', () => {
    const token = '--not-an-option-after-delimiter';
    const result = capture(() => run(['validate', '--', token]));
    expect(result.code).toBe(7);
    expect(result.stderr).toBe('I/O error: unable to read the selected input\n');
    expect(result.stderr).not.toContain(token);
  });

  it('never exposes a render --url option', () => {
    const secretUrl = 'https://example.invalid/SECRET_TOKEN';
    const result = capture(() =>
      run(['render', 'request.json', '--url', secretUrl, '--output', 'figure.svg']),
    );
    expect(result.code).toBe(2);
    expect(result.stderr).not.toContain(secretUrl);
    expect(result.stderr).not.toContain('SECRET_TOKEN');
  });
});

function expectedExitForStage(stage: ErrorStage): number {
  if (stage === 'parse' || stage === 'snapshot') return 3;
  if (stage === 'identity' || stage === 'structural') return 4;
  if (stage === 'budget' || stage === 'serialize') return 6;
  if (stage === 'internal') return 8;
  return 5;
}

function diagnostic(code: ErrorCode): CortexelError {
  const meta = ERROR_CODE_META[code];
  return {
    code,
    severity: meta.severity,
    stage: meta.stage,
    instancePath: '',
    message: meta.summary,
  };
}

describe('cli — exit codes are an exhaustive stable contract', () => {
  it('maps every registered error code and therefore every declared stage', () => {
    const seenStages = new Set<ErrorStage>();
    for (const [code, meta] of Object.entries(ERROR_CODE_META) as [ErrorCode, (typeof ERROR_CODE_META)[ErrorCode]][]) {
      seenStages.add(meta.stage);
      expect(exitCodeForErrors([diagnostic(code)]), code).toBe(expectedExitForStage(meta.stage));
    }
    expect([...seenStages].sort()).toEqual([...ERROR_STAGES].sort());
  });

  it('maps serialized output resource refusal to budget exit 6', () => {
    expect(exitCodeForErrors([diagnostic('RESOURCE_OUTPUT_BYTES_EXCEEDED')])).toBe(6);
    expect(exitCodeForErrors([diagnostic('RESOURCE_SIDECAR_BYTES_EXCEEDED')])).toBe(6);
  });

  it('gives a genuine internal error precedence without letting the error-cap warning override', () => {
    expect(
      exitCodeForErrors([
        diagnostic('JSON_SYNTAX'),
        diagnostic('INTERNAL_INVARIANT_VIOLATED'),
      ]),
    ).toBe(8);
    expect(
      exitCodeForErrors([
        diagnostic('SEMANTIC_LENGTH_MISMATCH'),
        diagnostic('ERROR_LIMIT_REACHED'),
      ]),
    ).toBe(5);
  });

  it('returns exact process codes for usage, valid, parse, schema, semantic, and I/O cases', () => {
    withTempDirectory((directory) => {
      const valid = writePopulationRateRequest(directory);
      const malformed = path.join(directory, 'malformed.json');
      const structurallyInvalid = path.join(directory, 'invalid.json');
      const legacy = path.join(directory, 'legacy.json');
      writeFileSync(malformed, '{', 'utf8');
      writeFileSync(structurallyInvalid, '{}', 'utf8');
      writeFileSync(
        legacy,
        JSON.stringify({ skill: { id: 'nest.voltage_trace' }, data: {}, parameters: {} }),
        'utf8',
      );

      expect(capture(() => run([])).code).toBe(2);
      expect(capture(() => run(['validate', valid])).code).toBe(0);
      expect(capture(() => run(['validate', malformed])).code).toBe(3);
      expect(capture(() => run(['validate', structurallyInvalid])).code).toBe(4);
      expect(capture(() => run(['migrate', legacy])).code).toBe(5);
      expect(capture(() => run(['validate', path.join(directory, 'missing.json')])).code).toBe(7);
    });
  });
});

describe('cli — diagnostics do not disclose caller filesystem paths', () => {
  it('bounds and sanitizes input I/O diagnostics', () => {
    const secret = `SECRET_INPUT_${'x'.repeat(300)}`;
    const input = path.join(tmpdir(), `${secret}\u001b[31m.json`);
    const result = capture(() => run(['validate', input]));
    expect(result.code).toBe(7);
    expect(result.stderr).not.toContain(secret);
    expect(result.stderr).not.toContain(tmpdir());
    expectBoundedSafeDiagnostic(result.stderr);
  });

  it('bounds and sanitizes output I/O diagnostics and successful stdout', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const secret = 'SECRET_OUTPUT_PATH';
      const output = path.join(directory, `${secret}\u001b[31m\0.svg`);
      const failed = capture(() => run(['render', request, '--output', output]));
      expect(failed.code).toBe(7);
      expect(failed.stderr).not.toContain(secret);
      expect(failed.stderr).not.toContain(directory);
      expectBoundedSafeDiagnostic(failed.stderr);

      const successfulOutput = path.join(directory, `${secret}.svg`);
      const successful = capture(() => run(['render', request, '--output', successfulOutput]));
      expect(successful.code).toBe(0);
      expect(successful.stdout).toBe(
        'wrote figure SVG and completion artifact (no canonical table sidecar)\n',
      );
      expect(successful.stdout).not.toContain(secret);
      expect(successful.stdout).not.toContain(directory);
    });
  });

  it('honors machine output for validate/render I/O, render success, and migrate I/O', () => {
    withTempDirectory((directory) => {
      const missing = path.join(directory, 'missing.json');
      const validateMissing = capture(() =>
        run(['validate', missing, '--format', 'json']));
      expect(validateMissing.code).toBe(7);
      expect(JSON.parse(validateMissing.stderr).cliError.kind).toBe('input_io');

      const migrateMissing = capture(() => run(['migrate', missing]));
      expect(migrateMissing.code).toBe(7);
      expect(JSON.parse(migrateMissing.stderr).cliError.kind).toBe('input_io');

      const missingResult = capture(() =>
        run(['render', missing, '--dry-run', '--format', 'json']));
      expect(missingResult.code).toBe(7);
      expect(JSON.parse(missingResult.stderr).cliError.kind).toBe('input_io');

      const request = writePopulationRateRequest(directory);
      const dryRun = capture(() =>
        run(['render', request, '--dry-run', '--format', 'json']));
      expect(dryRun.code).toBe(0);
      expect(JSON.parse(dryRun.stdout)).toEqual(expect.objectContaining({
        ok: true,
        dryRun: true,
        skill: 'neuro.population_rate',
      }));

      const output = path.join(directory, 'formatted.svg');
      const written = capture(() =>
        run(['render', request, '--output', output, '--format', 'json']));
      expect(written.code).toBe(0);
      const receipt = JSON.parse(written.stdout);
      expect(receipt).toEqual(expect.objectContaining({
        ok: true,
        dryRun: false,
        skill: 'neuro.population_rate',
        tableSidecar: null,
      }));
      expect(receipt.artifactDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      assertBoundArtifact(output);

      const occupied = capture(() =>
        run(['render', request, '--output', output, '--format', 'json']));
      expect(occupied.code).toBe(7);
      expect(JSON.parse(occupied.stderr).cliError.kind).toBe('output_io');
    });
  });
});

describe('cli — bounded raw-byte and UTF-8 boundary', () => {
  it('rejects malformed UTF-8 bytes from a file without replacement decoding', () => {
    withTempDirectory((directory) => {
      const input = path.join(directory, 'invalid.json');
      writeFileSync(input, Buffer.concat([
        Buffer.from('{"label":"', 'utf8'),
        Buffer.from([0xff]),
        Buffer.from('"}\n', 'utf8'),
      ]));
      const result = capture(() => run(['validate', input, '--format', 'json']));
      expect(result.code).toBe(3);
      expect(result.stdout).toBe('');
      const diagnostic = JSON.parse(result.stderr);
      expect(diagnostic.errors[0].code).toBe('JSON_INVALID_UNICODE');
      expect(result.stderr).not.toContain('\ufffd');
      expect(result.stderr).not.toContain(directory);
    });
  });

  it('rejects malformed UTF-8 bytes from stdin without replacement decoding', async () => {
    const bytes = Buffer.concat([
      Buffer.from('{"label":"', 'utf8'),
      Buffer.from([0xc3, 0x28]),
      Buffer.from('"}\n', 'utf8'),
    ]);
    const result = await runCli(['validate', '-', '--format', 'json'], bytes);
    expect(result.code).toBe(3);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr).errors[0].code).toBe('JSON_INVALID_UNICODE');
    expect(result.stderr).not.toContain('\ufffd');
  });

  it('preserves a UTF-8 BOM for the strict parser to reject explicitly', () => {
    withTempDirectory((directory) => {
      const input = path.join(directory, 'bom.json');
      writeFileSync(input, Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('{}', 'utf8'),
      ]));
      const result = capture(() => run(['validate', input, '--format', 'json']));
      expect(result.code).toBe(3);
      expect(JSON.parse(result.stderr).errors[0].code).toBe('JSON_BOM_NOT_ALLOWED');
    });
  });

  it('stops at the host byte limit plus one instead of materializing an unbounded file', () => {
    withTempDirectory((directory) => {
      const input = path.join(directory, 'oversized.json');
      const limit = getBudgetLimits('standard').rawInputBytes;
      writeFileSync(input, Buffer.alloc(limit + 1, 0x20));
      const result = capture(() => run(['validate', input, '--format', 'json']));
      expect(result.code).toBe(3);
      const error = JSON.parse(result.stderr).errors[0];
      expect(error.code).toBe('JSON_BYTES_EXCEEDED');
      expect(error.limit).toEqual({ name: 'rawInputBytes', limit, observed: limit + 1 });
    });
  });
});

describe('cli — render emission boundary', () => {
  it('requires --output before reading input, except for a pure dry run', () => {
    const missing = path.join(tmpdir(), 'cortexel-cli-input-that-does-not-exist.json');
    const refused = capture(() => run(['render', missing]));
    expect(refused.code).toBe(2);
    expect(refused.stderr).toContain('requires --output');
    expect(refused.stderr).not.toContain('I/O error');

    for (const invalidOutput of ['figure', 'figure.SVG', '.svg']) {
      const invalid = capture(() => run(['render', missing, '--output', invalidOutput]));
      expect(invalid.code, invalidOutput).toBe(2);
      expect(invalid.stderr, invalidOutput).toBe(
        'usage error: --output must name a nonempty .svg file\n',
      );
    }

    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const dryRun = capture(() => run(['render', request, '--dry-run']));
      expect(dryRun.code).toBe(0);
      expect(dryRun.stdout).toContain('would render neuro.population_rate');
      expect(readdirSync(directory).sort()).toEqual(['request.json']);
    });
  });

  it.each(['svg', 'artifact'] as const)(
    'refuses every existing %s directory entry without --force',
    (existing) => {
      withTempDirectory((directory) => {
        const request = writePopulationRateRequest(directory);
        const output = path.join(directory, 'figure.svg');
        const artifact = artifactPath(output);
        const occupied = existing === 'svg' ? output : artifact;
        const other = existing === 'svg' ? artifact : output;
        writeFileSync(occupied, 'do-not-overwrite', 'utf8');

        const result = capture(() => run(['render', request, '--output', output]));
        expect(result.code).toBe(7);
        expect(result.stderr).toContain('refusing to overwrite');
        expect(result.stderr).not.toContain(directory);
        expect(readFileSync(occupied, 'utf8')).toBe('do-not-overwrite');
        expect(existsSync(other)).toBe(false);
        expect(stagedTempNames(directory)).toEqual([]);
      });
    },
  );

  it.each(['svg', 'artifact'] as const)(
    'detects a dangling %s symlink with lstat and never follows its target',
    (existing) => {
      withTempDirectory((directory) => {
        const request = writePopulationRateRequest(directory);
        const output = path.join(directory, 'figure.svg');
        const artifact = artifactPath(output);
        const occupied = existing === 'svg' ? output : artifact;
        const other = existing === 'svg' ? artifact : output;
        const danglingTarget = path.join(directory, 'must-remain-absent');
        symlinkSync(danglingTarget, occupied);

        const result = capture(() => run(['render', request, '--output', output]));
        expect(result.code).toBe(7);
        expect(lstatSync(occupied).isSymbolicLink()).toBe(true);
        expect(existsSync(danglingTarget)).toBe(false);
        expect(existsSync(other)).toBe(false);
        expect(stagedTempNames(directory)).toEqual([]);
      });
    },
  );

  it('force replaces destination symlink entries without modifying their targets', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      const artifact = artifactPath(output);
      const svgTarget = path.join(directory, 'outside-svg-target');
      const artifactTarget = path.join(directory, 'outside-artifact-target');
      writeFileSync(svgTarget, 'sentinel-svg', 'utf8');
      writeFileSync(artifactTarget, 'sentinel-artifact', 'utf8');
      symlinkSync(svgTarget, output);
      symlinkSync(artifactTarget, artifact);

      const result = capture(() => run(['render', request, '--output', output, '--force']));
      expect(result.code).toBe(0);
      expect(lstatSync(output).isSymbolicLink()).toBe(false);
      expect(lstatSync(artifact).isSymbolicLink()).toBe(false);
      expect(readFileSync(svgTarget, 'utf8')).toBe('sentinel-svg');
      expect(readFileSync(artifactTarget, 'utf8')).toBe('sentinel-artifact');
      assertBoundArtifact(output);
    });
  });

  it('writes one normative SVG and canonical artifact with exact digest binding', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      // Old fixed-name temporary files are unrelated and must not be opened or replaced.
      const oldFixedSvgTemp = path.join(directory, '.figure.svg.tmp');
      const oldFixedArtifactTemp = path.join(directory, '.figure.artifact.json.tmp');
      writeFileSync(oldFixedSvgTemp, 'unrelated-svg-temp', 'utf8');
      writeFileSync(oldFixedArtifactTemp, 'unrelated-artifact-temp', 'utf8');

      const result = capture(() => run(['render', request, '--output', output]));
      expect(result.code).toBe(0);
      assertBoundArtifact(output);
      expect(readFileSync(oldFixedSvgTemp, 'utf8')).toBe('unrelated-svg-temp');
      expect(readFileSync(oldFixedArtifactTemp, 'utf8')).toBe('unrelated-artifact-temp');
      expect(stagedTempNames(directory)).toEqual([]);
    });
  });

  it('uses a fixed short unpredictable temp basename near NAME_MAX', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      // 240 final bytes and 250 derived artifact bytes fit a typical 255-byte NAME_MAX;
      // prefixing either full basename into a temp name would exceed it.
      const output = path.join(directory, `${'f'.repeat(236)}.svg`);
      const result = capture(() => run(['render', request, '--output', output]));
      expect(result.code).toBe(0);
      assertBoundArtifact(output);
      expect(stagedTempNames(directory)).toEqual([]);
    });
  });

  it('preflights force-incompatible directories before removing an old completion marker', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      const artifact = artifactPath(output);
      writeFileSync(artifact, 'old-completion-marker', 'utf8');
      // A directory cannot be atomically replaced as a figure file.
      mkdirSync(output);

      const result = capture(() => run(['render', request, '--output', output, '--force']));
      expect(result.code).toBe(7);
      expect(result.stderr).toContain('does not replace destination directories');
      expect(readFileSync(artifact, 'utf8')).toBe('old-completion-marker');
      expect(lstatSync(output).isDirectory()).toBe(true);
      expect(stagedTempNames(directory)).toEqual([]);
    });
  });

  it('replaces a stale force artifact only after staging and returns a newly bound pair', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      const artifact = artifactPath(output);
      writeFileSync(output, 'old-svg', 'utf8');
      writeFileSync(artifact, 'old-artifact', 'utf8');

      const result = capture(() => run(['render', request, '--output', output, '--force']));
      expect(result.code).toBe(0);
      expect(readFileSync(output, 'utf8')).not.toBe('old-svg');
      expect(readFileSync(artifact, 'utf8')).not.toBe('old-artifact');
      assertBoundArtifact(output);
      expect(stagedTempNames(directory)).toEqual([]);
      expect(emissionLockNames(directory)).toEqual([]);
    });
  });

  it('never guesses that a pre-existing output lock is stale', () => {
    withTempDirectory((directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      const artifact = artifactPath(output);
      writeFileSync(output, 'old-svg', 'utf8');
      writeFileSync(artifact, 'old-artifact', 'utf8');
      const lock = emissionLockPath(output);
      writeFileSync(lock, '', { flag: 'wx', mode: 0o600 });

      const result = capture(() => run(['render', request, '--output', output, '--force']));
      expect(result.code).toBe(7);
      expect(result.stderr).toContain('another writer owns this figure output lock');
      expect(result.stderr).toContain('remove the stale .cortexel.figure-emission.lock entry manually');
      expect(result.stderr).not.toContain(directory);
      expect(readFileSync(output, 'utf8')).toBe('old-svg');
      expect(readFileSync(artifact, 'utf8')).toBe('old-artifact');
      expect(stagedTempNames(directory)).toEqual([]);
      expect(emissionLockNames(directory)).toEqual([path.basename(lock)]);
    });
  });

  it('uses one directory authority for case aliases when the filesystem aliases them', () => {
    withTempDirectory((directory) => {
      const probeUpper = path.join(directory, 'Cortexel-Case-Probe');
      const probeLower = path.join(directory, 'cortexel-case-probe');
      writeFileSync(probeUpper, 'probe', { flag: 'wx' });
      const aliasesCase = existsSync(probeLower);
      unlinkSync(probeUpper);
      if (!aliasesCase) return;

      const request = writePopulationRateRequest(directory);
      const upperOutput = path.join(directory, 'Figure.svg');
      const lowerOutput = path.join(directory, 'figure.svg');
      expect(emissionLockPath(upperOutput)).toBe(emissionLockPath(lowerOutput));
      const lock = emissionLockPath(upperOutput);
      writeFileSync(lock, '', { flag: 'wx', mode: 0o600 });

      const result = capture(() => run(['render', request, '--output', lowerOutput, '--force']));
      expect(result.code).toBe(7);
      expect(result.stderr).toContain('another writer owns this figure output lock');
      expect(existsSync(lowerOutput)).toBe(false);
      expect(stagedTempNames(directory)).toEqual([]);
      expect(emissionLockNames(directory)).toEqual([path.basename(lock)]);
    });
  });

  it('atomically permits only one non-force publisher under a real process race', async () => {
    await withTempDirectoryAsync(async (directory) => {
      const request = writePopulationRateRequest(directory);
      const output = path.join(directory, 'figure.svg');
      const argv = ['render', request, '--output', output] as const;
      const results = await Promise.all([runCli(argv), runCli(argv)]);
      expect(results.map((result) => result.code).sort()).toEqual([0, 7]);
      const loser = results.find((result) => result.code === 7)!;
      expect(
        loser.stderr.includes('refusing to overwrite') ||
        loser.stderr.includes('another writer owns this figure output lock'),
      ).toBe(true);
      expect(loser.stderr).not.toContain(directory);
      assertBoundArtifact(output);
      expect(stagedTempNames(directory)).toEqual([]);
      expect(emissionLockNames(directory)).toEqual([]);
    });
  });

  it('keeps a bound pair under concurrent force publishers', async () => {
    await withTempDirectoryAsync(async (directory) => {
      const output = path.join(directory, 'figure.svg');
      const requests = Array.from({ length: 8 }, (_unused, index) => {
        const request = structuredClone(populationRate) as Record<string, unknown>;
        request.presentation = { title: `force writer ${index}` };
        const filename = path.join(directory, `request-${index}.json`);
        writeFileSync(filename, `${JSON.stringify(request)}\n`, 'utf8');
        return filename;
      });
      const results = await Promise.all(requests.map((request) =>
        runCli(['render', request, '--output', output, '--force'])));
      expect(results.some((result) => result.code === 0)).toBe(true);
      expect(results.every((result) => result.code === 0 || result.code === 7)).toBe(true);
      for (const result of results.filter((candidate) => candidate.code === 7)) {
        expect(result.stderr).toContain('another writer owns this figure output lock');
      }
      assertBoundArtifact(output);
      expect(stagedTempNames(directory)).toEqual([]);
      expect(emissionLockNames(directory)).toEqual([]);
    });
  });
});
