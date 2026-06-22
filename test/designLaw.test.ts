import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Executable guards for the Cortexel design law (previously prose-only):
//   * useFrame must be allocation-free (no `new THREE.*` per frame),
//   * emissive intensity stays bloom-safe (<= 1.15) to avoid white blowout,
//   * populations are unlit (MeshBasic), never an emissive standard material.
// Source-level scan — no rendering required.
const here = dirname(fileURLToPath(import.meta.url));
const reactDir = join(here, '..', 'react');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory()
      ? walk(p)
      : /\.tsx?$/.test(p)
        ? [p]
        : [];
  });
}

/** Extract each useFrame callback body via brace matching. */
function useFrameBodies(src: string): string[] {
  const bodies: string[] = [];
  let idx = src.indexOf('useFrame(');
  while (idx !== -1) {
    const open = src.indexOf('{', idx);
    if (open !== -1) {
      let depth = 0;
      let end = open;
      for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      bodies.push(src.slice(open, end + 1));
    }
    idx = src.indexOf('useFrame(', idx + 1);
  }
  return bodies;
}

describe('design law (executable)', () => {
  const files = walk(reactDir);

  it('useFrame callbacks allocate nothing per frame', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const body of useFrameBodies(readFileSync(f, 'utf8'))) {
        // `new THREE.X`, `new Vector3`, array/object literals assigned each frame
        if (/\bnew\s+(THREE\.)?[A-Z]\w*/.test(body)) {
          offenders.push(`${f}: allocation inside useFrame`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('emissive intensity stays bloom-safe (<= 1.15)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const re = /emissiveIntensity[=:]\s*\{?\s*([0-9]+(?:\.[0-9]+)?)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (parseFloat(m[1]) > 1.15) offenders.push(`${f}: emissiveIntensity ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('populations use an unlit material (no emissive standard material)', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // A standard material carrying emissive is a bloom/honesty hazard for the
      // passive population voxel; flag it if it appears.
      expect(
        /meshStandardMaterial[^>]*emissive/.test(src),
        `${f} uses an emissive standard material`,
      ).toBe(false);
    }
  });
});
