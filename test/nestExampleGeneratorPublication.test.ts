import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  nestExampleSourceInventoryGeneratorTesting,
  writeNewNestExampleInventoryFile,
} from '../scripts/generate-nest-example-source-inventory.js';

function forbiddenSink<T extends (...arguments_: never[]) => unknown>(
  implementation: T,
  counts: { apply: number; property: number },
): T {
  return new Proxy(implementation, {
    apply(target, thisArgument, argumentsList) {
      counts.apply++;
      return Reflect.apply(target, thisArgument, argumentsList);
    },
    get() {
      counts.property++;
      throw new Error('publication sink property authority was inspected');
    },
    getOwnPropertyDescriptor() {
      counts.property++;
      throw new Error('publication sink descriptor authority was inspected');
    },
    getPrototypeOf() {
      counts.property++;
      throw new Error('publication sink prototype authority was inspected');
    },
    ownKeys() {
      counts.property++;
      throw new Error('publication sink key authority was inspected');
    },
  });
}

describe('NEST example inventory cleanup-before-publication ordering', () => {
  it('gates both stdout and exclusive file publication on successful cleanup', () => {
    for (const selected of ['stdout', 'file'] as const) {
      const parent = realpathSync(mkdtempSync(
        path.join(tmpdir(), 'cortexel-generator-publication-'),
      ));
      const target = path.join(parent, 'inventory.json');
      const stdoutCounts = { apply: 0, property: 0 };
      const publisherCounts = { apply: 0, property: 0 };
      let cleanupCalls = 0;
      const sentinel = new Error(`synthetic ${selected} cleanup failure`);
      const stdoutSink = forbiddenSink(
        (_content: string): void => {
          throw new Error('stdout publication ran before cleanup succeeded');
        },
        stdoutCounts,
      );
      const publisherSink = forbiddenSink(
        (filename: string, content: string): void => {
          writeNewNestExampleInventoryFile(filename, content);
        },
        publisherCounts,
      );
      try {
        expect(() => nestExampleSourceInventoryGeneratorTesting.publishAfterCleanup(
          selected === 'stdout' ? null : target,
          '{}\n',
          () => {
            cleanupCalls++;
            throw sentinel;
          },
          stdoutSink,
          publisherSink,
        )).toThrow(sentinel);
        expect(cleanupCalls).toBe(1);
        expect(stdoutCounts).toEqual({ apply: 0, property: 0 });
        expect(publisherCounts).toEqual({ apply: 0, property: 0 });
        expect(existsSync(target)).toBe(false);
      } finally {
        rmSync(parent, { force: true, recursive: true });
      }
    }
  });

  it('publishes exactly one selected sink only after successful cleanup', () => {
    for (const selected of ['stdout', 'file'] as const) {
      const parent = realpathSync(mkdtempSync(
        path.join(tmpdir(), 'cortexel-generator-publication-success-'),
      ));
      const target = path.join(parent, 'inventory.json');
      const events: string[] = [];
      let stdout = '';
      try {
        nestExampleSourceInventoryGeneratorTesting.publishAfterCleanup(
          selected === 'stdout' ? null : target,
          '{}\n',
          () => events.push('cleanup'),
          (content) => {
            events.push('stdout');
            stdout += content;
          },
          (filename, content) => {
            events.push('file');
            writeNewNestExampleInventoryFile(filename, content);
          },
        );
        expect(events).toEqual(['cleanup', selected]);
        if (selected === 'stdout') {
          expect(stdout).toBe('{}\n');
          expect(existsSync(target)).toBe(false);
        } else {
          expect(stdout).toBe('');
          expect(readFileSync(target, 'utf8')).toBe('{}\n');
        }
      } finally {
        rmSync(parent, { force: true, recursive: true });
      }
    }
  });

  it('retries only the unfinished cleanup phase after partial success', () => {
    const events: string[] = [];
    let removeAttempts = 0;
    const cleanup = nestExampleSourceInventoryGeneratorTesting.retryableOrderedCleanup(
      () => events.push('dispose'),
      () => {
        removeAttempts++;
        events.push(`remove-${removeAttempts}`);
        if (removeAttempts === 1) throw new Error('synthetic root removal failure');
      },
    );
    expect(cleanup).toThrow(/synthetic root removal failure/u);
    expect(events).toEqual(['dispose', 'remove-1']);
    expect(cleanup).not.toThrow();
    expect(events).toEqual(['dispose', 'remove-1', 'remove-2']);
    expect(cleanup).not.toThrow();
    expect(events).toEqual(['dispose', 'remove-1', 'remove-2']);
  });
});
