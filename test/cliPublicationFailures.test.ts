import { readFileSync, readdirSync, rmSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const faults = vi.hoisted(() => ({ failLockFstatOnce: false, failTempUnlinkOnce: false }));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const injectedIoError = (operation: string): NodeJS.ErrnoException => {
    const error = new Error(`injected ${operation} failure`) as NodeJS.ErrnoException;
    error.code = 'EIO';
    return error;
  };
  return {
    ...actual,
    fstatSync: (...args: unknown[]) => {
      if (faults.failLockFstatOnce) {
        faults.failLockFstatOnce = false;
        throw injectedIoError('fstat');
      }
      return (actual.fstatSync as (...values: unknown[]) => unknown)(...args);
    },
    unlinkSync: (...args: unknown[]) => {
      const target = String(args[0]);
      if (faults.failTempUnlinkOnce && /\.[0-9a-f]{32}\.cortexel\.tmp$/u.test(target)) {
        faults.failTempUnlinkOnce = false;
        throw injectedIoError('unlink');
      }
      return (actual.unlinkSync as (...values: unknown[]) => unknown)(...args);
    },
  };
});

import { run } from '../src/cli/main.js';

const populationRate = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/neuro.population_rate.v1.json'),
  'utf8',
)).examples.valid[0];

function capture(fn: () => number): { readonly code: number; readonly stderr: string } {
  const chunks: string[] = [];
  const originalOut = process.stdout.write.bind(process.stdout);
  const originalErr = process.stderr.write.bind(process.stderr);
  (process.stdout.write as unknown as (text: string) => boolean) = () => true;
  (process.stderr.write as unknown as (text: string) => boolean) = (text: string) => {
    chunks.push(text);
    return true;
  };
  try {
    return { code: fn(), stderr: chunks.join('') };
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
}

function fixture(): { readonly directory: string; readonly request: string; readonly svg: string } {
  const directory = mkdtempSync(path.join(tmpdir(), 'cortexel-cli-fault-'));
  const request = path.join(directory, 'request.json');
  writeFileSync(request, `${JSON.stringify(populationRate)}\n`, 'utf8');
  return { directory, request, svg: path.join(directory, 'figure.svg') };
}

afterEach(() => {
  faults.failLockFstatOnce = false;
  faults.failTempUnlinkOnce = false;
});

describe('CLI publication failure closure', () => {
  it('closes and removes a newly-created lock when identity inspection fails', () => {
    const { directory, request, svg } = fixture();
    try {
      faults.failLockFstatOnce = true;
      const result = capture(() => run(['render', request, '--output', svg]));
      expect(result.code).toBe(7);
      expect(result.stderr).toContain('unable to publish the figure outputs');
      expect(existsSync(path.join(directory, '.cortexel.figure-emission.lock'))).toBe(false);
      expect(existsSync(svg)).toBe(false);
      expect(existsSync(svg.replace(/\.svg$/u, '.artifact.json'))).toBe(false);
      expect(readdirSync(directory).filter((name) => name.endsWith('.cortexel.tmp'))).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('never reports success when the published hard-link staging name cannot be removed', () => {
    const { directory, request, svg } = fixture();
    try {
      faults.failTempUnlinkOnce = true;
      const result = capture(() => run(['render', request, '--output', svg]));
      expect(result.code).toBe(7);
      // The linked SVG may remain, but artifact absence is the documented incomplete marker.
      expect(existsSync(svg)).toBe(true);
      expect(existsSync(svg.replace(/\.svg$/u, '.artifact.json'))).toBe(false);
      expect(readdirSync(directory).filter((name) => name.endsWith('.cortexel.tmp'))).toEqual([]);
      expect(existsSync(path.join(directory, '.cortexel.figure-emission.lock'))).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
