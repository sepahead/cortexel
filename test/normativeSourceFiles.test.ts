import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { Buffer } from 'node:buffer';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { enumerateNormativeContractFiles } from '../scripts/lib/normative-source-files.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'contract');

function withContractCopy(fn: (root: string) => void): void {
  const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-source-files-'));
  try {
    cpSync(SOURCE, temporary, { recursive: true });
    fn(temporary);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

describe('closed recursive normative-source inventory', () => {
  it('is sorted, recursive, and explicitly excludes only root metadata/corpus entries', () => {
    const files = enumerateNormativeContractFiles(SOURCE);
    expect(files).toEqual([...files].sort());
    expect(files).toHaveLength(58);
    expect(files).toContain('meta/contract-source.schema.json');
    expect(files).toContain('schemas/skills/neuro.psth.request.v1.schema.json');
    expect(files).not.toContain('manifest.v1.json');
    expect(files).not.toContain('README.md');
    expect(files.filter((name) => name.startsWith('skills/'))).toHaveLength(19);
  });

  it('includes a future nested JSON source in stable relative-path order', () => {
    withContractCopy((temporary) => {
      const nested = path.join(temporary, 'registries', 'future');
      mkdirSync(nested);
      writeFileSync(path.join(nested, 'extension.v1.json'), '{"kind":"future"}\n');
      const files = enumerateNormativeContractFiles(temporary);
      expect(files).toContain('registries/future/extension.v1.json');
      expect(files).toEqual([...files].sort());
    });
  });

  it('uses the declared UTF-8 byte order rather than JavaScript UTF-16 order', () => {
    withContractCopy((temporary) => {
      const nested = path.join(temporary, 'registries', 'future');
      mkdirSync(nested);
      writeFileSync(path.join(nested, '\ue000.json'), '{}\n');
      writeFileSync(path.join(nested, '\u{10000}.json'), '{}\n');
      const exotic = enumerateNormativeContractFiles(temporary)
        .filter((name) => name.startsWith('registries/future/'));
      expect(exotic).toEqual([...exotic].sort((left, right) =>
        Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))));
      expect(exotic).toEqual([
        'registries/future/\ue000.json',
        'registries/future/\u{10000}.json',
      ]);
    });
  });

  it('rejects an ill-formed UTF-8 filename instead of conflating replacement characters', () => {
    if (process.platform === 'win32') return;
    withContractCopy((temporary) => {
      const nested = path.join(temporary, 'registries', 'future');
      mkdirSync(nested);
      writeFileSync(path.join(nested, '\ufffd.json'), '{"valid":"replacement character"}\n');
      const invalid = Buffer.concat([
        Buffer.from(`${nested}${path.sep}`),
        Buffer.from([0xff]),
        Buffer.from('.json'),
      ]);
      try {
        writeFileSync(invalid, '{"invalid":"filename byte"}\n');
      } catch (error) {
        // APFS rejects ill-formed UTF-8 names at creation time; that host already
        // enforces the boundary this fixture exercises on byte-oriented filesystems.
        if ((error as NodeJS.ErrnoException).code === 'EILSEQ') return;
        throw error;
      }
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'normative directory registries/future contains a filename that is not well-formed UTF-8',
      );
    });
  });

  it('rejects unexpected root entries and non-JSON files below a normative root', () => {
    withContractCopy((temporary) => {
      writeFileSync(path.join(temporary, 'undeclared.json'), '{}\n');
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'unexpected contract-root entry: undeclared.json',
      );
    });

    withContractCopy((temporary) => {
      writeFileSync(path.join(temporary, 'registries', 'notes.txt'), 'not normative JSON\n');
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'non-JSON file appears in a normative contract directory: registries/notes.txt',
      );
    });
  });

  it('names conformance as a non-normative root exclusion without following it', () => {
    withContractCopy((temporary) => {
      const conformance = path.join(temporary, 'conformance');
      mkdirSync(conformance);
      writeFileSync(path.join(conformance, 'vectors.json'), '{"not":"normative"}\n');
      expect(enumerateNormativeContractFiles(temporary)).not.toContain(
        'conformance/vectors.json',
      );
    });
  });

  it('rejects symlinks in normative and explicitly excluded root paths', () => {
    if (process.platform === 'win32') return;

    withContractCopy((temporary) => {
      const link = path.join(temporary, 'registries', 'identity-link.v1.json');
      symlinkSync(path.join(temporary, 'registries', 'identity.v1.json'), link);
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'normative contract path is a symbolic link: registries/identity-link.v1.json',
      );
    });

    withContractCopy((temporary) => {
      const readme = path.join(temporary, 'README.md');
      unlinkSync(readme);
      symlinkSync(path.join(SOURCE, 'README.md'), readme);
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'excluded contract-root path README.md is a symbolic link',
      );
    });

    withContractCopy((temporary) => {
      const outside = path.join(temporary, 'outside-conformance');
      mkdirSync(outside);
      symlinkSync(outside, path.join(temporary, 'conformance'), 'dir');
      expect(() => enumerateNormativeContractFiles(temporary)).toThrow(
        'excluded contract-root path conformance is a symbolic link',
      );
    });
  });
});
