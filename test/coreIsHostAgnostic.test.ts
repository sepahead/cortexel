import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Guard the design law: cortexel/core (incl. the new skills/ + nest/ axis) must
// be importable in a pure-Node/backend context — zero-dep beyond zod. No three,
// no react, no @react-three/* may leak into anything core/ imports.
const here = dirname(fileURLToPath(import.meta.url));
const coreDir = join(here, '..', 'core');

const FORBIDDEN = ['three', 'react', '@react-three/fiber', '@react-three/drei'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('core is host-agnostic', () => {
  it('no core/ file imports three/react/@react-three', () => {
    const offenders: string[] = [];
    for (const file of walk(coreDir)) {
      const src = readFileSync(file, 'utf8');
      for (const dep of FORBIDDEN) {
        const re = new RegExp(`from ['"]${dep.replace('/', '\\/')}['"]`);
        if (re.test(src)) offenders.push(`${file} → ${dep}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('imports cortexel/core skill axis in this Node process', async () => {
    const mod = await import('../core/index');
    expect(typeof mod.validateSkillInvocation).toBe('function');
    expect(typeof mod.routeToScene).toBe('function');
    expect(Array.isArray(mod.PI_NEST_SKILL_IDS)).toBe(true);
  });
});
