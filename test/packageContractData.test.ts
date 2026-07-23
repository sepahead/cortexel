import {
  cpSync,
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

import { describe, expect, it } from 'vitest';

import {
  contractPackageProblems,
  packagedContractRelativeFiles,
  copyContractForPackage,
} from '../scripts/lib/contract-package.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'contract');

function withContractCopy(fn: (root: string) => void): void {
  const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-contract-package-'));
  try {
    cpSync(SOURCE, temporary, { recursive: true });
    fn(temporary);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function findNamed(root: string, name: string, output: string[] = []): string[] {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) findNamed(absolute, name, output);
    if (entry.isFile() && entry.name === name) output.push(absolute);
  }
  return output;
}

describe('packaged normative contract', () => {
  it('creates one exact physical copy with a closed, digest-bound inventory', () => {
    expect(contractPackageProblems(SOURCE)).toEqual([]);
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-contract-output-'));
    try {
      const packaged = path.join(temporary, 'dist', 'contract');
      const expected = packagedContractRelativeFiles(SOURCE);
      expect(copyContractForPackage(SOURCE, packaged)).toEqual(expected);
      expect(contractPackageProblems(packaged)).toEqual([]);
      expect(packagedContractRelativeFiles(packaged)).toEqual(expected);
      for (const relative of expected) {
        expect(readFileSync(path.join(packaged, relative))).toEqual(
          readFileSync(path.join(SOURCE, relative)),
        );
      }
      expect(findNamed(temporary, 'manifest.v1.json')).toEqual([
        path.join(packaged, 'manifest.v1.json'),
      ]);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  // Two complete, independently rooted inventory/digest passes can exceed 30 seconds
  // on a cold filesystem; 90 seconds remains a bounded failure signal.
  }, 90_000);

  it('detects changed, absent, and undeclared normative bytes', () => {
    withContractCopy((temporary) => {
      const capabilities = path.join(temporary, 'registries', 'capabilities.v1.json');
      const value = JSON.parse(readFileSync(capabilities, 'utf8')) as Record<string, unknown>;
      value.description = `${String(value.description)} changed`;
      writeFileSync(capabilities, `${JSON.stringify(value, null, 2)}\n`);
      expect(contractPackageProblems(temporary)).toEqual(expect.arrayContaining([
        expect.stringContaining('contract/registries/capabilities.v1.json digest differs'),
        expect.stringContaining('manifest.contractDigest does not match'),
      ]));
    });

    withContractCopy((temporary) => {
      unlinkSync(path.join(temporary, 'schemas', 'figure-request.v1.schema.json'));
      expect(contractPackageProblems(temporary)).toContain(
        'manifest inventory names absent normative source contract/schemas/figure-request.v1.schema.json',
      );
    });

    withContractCopy((temporary) => {
      writeFileSync(path.join(temporary, 'schemas', 'undeclared.schema.json'), '{}\n');
      expect(contractPackageProblems(temporary)).toContain(
        'manifest inventory is missing normative source contract/schemas/undeclared.schema.json',
      );
    });
  });

  it('derives every public manifest field instead of trusting a self-description', () => {
    const living = JSON.parse(readFileSync(path.join(SOURCE, 'manifest.v1.json'), 'utf8')) as
      Record<string, unknown>;
    for (const key of Object.keys(living)) {
      withContractCopy((temporary) => {
        const manifestFile = path.join(temporary, 'manifest.v1.json');
        const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
        const current = manifest[key];
        if (Array.isArray(current)) {
          manifest[key] = current.length > 0 ? current.slice(1) : ['invented'];
        } else if (current !== null && typeof current === 'object') {
          manifest[key] = { ...(current as Record<string, unknown>), invented: true };
        } else if (typeof current === 'string') {
          manifest[key] = `${current}-invented`;
        } else if (typeof current === 'number') {
          manifest[key] = current + 1;
        } else if (typeof current === 'boolean') {
          manifest[key] = !current;
        } else {
          manifest[key] = 'invented';
        }
        writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
        expect(
          contractPackageProblems(temporary),
          `top-level manifest field ${key}`,
        ).toContain('manifest does not equal the exact projection derived from normative sources');
      });
    }
  }, 30_000);

  it('fails closed on a malformed or indirect manifest without throwing', () => {
    withContractCopy((temporary) => {
      writeFileSync(path.join(temporary, 'manifest.v1.json'), 'null\n');
      expect(contractPackageProblems(temporary)).toEqual([
        'contract/manifest.v1.json must contain a JSON object',
      ]);
    });

    if (process.platform !== 'win32') {
      withContractCopy((temporary) => {
        const manifest = path.join(temporary, 'manifest.v1.json');
        const target = path.join(temporary, 'manifest-target.json');
        writeFileSync(target, readFileSync(manifest));
        unlinkSync(manifest);
        symlinkSync(target, manifest);
        expect(contractPackageProblems(temporary)).toEqual([
          'contract/manifest.v1.json is a symbolic link',
        ]);
      });
    }
  });

  it('refuses malformed UTF-8 and BOM-bearing normative bytes', () => {
    withContractCopy((temporary) => {
      const capabilities = path.join(temporary, 'registries', 'capabilities.v1.json');
      writeFileSync(capabilities, Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]));
      expect(contractPackageProblems(temporary).some((problem) =>
        problem.includes('normative JSON source is not well-formed UTF-8'))).toBe(true);
    });

    withContractCopy((temporary) => {
      const capabilities = path.join(temporary, 'registries', 'capabilities.v1.json');
      writeFileSync(capabilities, Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        readFileSync(capabilities),
      ]));
      expect(contractPackageProblems(temporary).some((problem) =>
        problem.includes('normative JSON source must not begin with a UTF-8 BOM'))).toBe(true);
    });
  });

  it('rejects an indirect contract root and destination boundary', () => {
    if (process.platform === 'win32') return;
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-contract-symlink-'));
    try {
      const sourceLink = path.join(temporary, 'source-link');
      symlinkSync(SOURCE, sourceLink, 'dir');
      expect(contractPackageProblems(sourceLink)).toEqual([
        'contract root is a symbolic link',
      ]);

      const outside = path.join(temporary, 'outside');
      mkdirSync(outside);
      const parentLink = path.join(temporary, 'parent-link');
      symlinkSync(outside, parentLink, 'dir');
      expect(() => copyContractForPackage(SOURCE, path.join(parentLink, 'contract')))
        .toThrow('packaged contract nearest existing parent is a symbolic link');
      expect(readdirSync(outside)).toEqual([]);

      const destinationLink = path.join(temporary, 'destination-link');
      symlinkSync(outside, destinationLink, 'dir');
      expect(() => copyContractForPackage(SOURCE, destinationLink))
        .toThrow('packaged contract destination root is a symbolic link');
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('declares the npm-required shebang in the CLI source', () => {
    const cli = path.join(ROOT, 'src', 'cli', 'main.ts');
    expect(readFileSync(cli, 'utf8').startsWith('#!/usr/bin/env node\n')).toBe(true);
  });
});
