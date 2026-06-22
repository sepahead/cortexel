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
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    for (const file of walk(coreDir)) {
      const src = readFileSync(file, 'utf8');
      for (const dep of FORBIDDEN) {
        // Catch `from 'dep'`, `import 'dep'`, `import(...'dep')`, `require('dep')`
        // and any subpath (`dep/x`) — not just the bare `from` form.
        const re = new RegExp(
          `(?:from|import|require)\\s*\\(?\\s*['"]${escape(dep)}(?:/[^'"]*)?['"]`,
        );
        if (re.test(src)) offenders.push(`${file} → ${dep}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('imports cortexel/core skill axis in this Node process', async () => {
    const mod = await import('../core/index');
    expect(typeof mod.validateSkillInvocation).toBe('function');
    expect(typeof mod.routeToScene).toBe('function');
    expect(typeof mod.describeSkill).toBe('function');
    expect(typeof mod.detectEmptyScene).toBe('function');
    expect(Array.isArray(mod.PI_NEST_SKILL_IDS)).toBe(true);
  });

  it('shipped core .d.ts does not leak Node types (types:["node"] hygiene)', () => {
    // tsconfig pulls @types/node for scripts/tests, but the published core types
    // must stay environment-neutral — no NodeJS.* / node: references.
    const distCore = join(here, '..', 'dist', 'core');
    if (!statSync(distCore, { throwIfNoEntry: false })?.isDirectory()) return; // pre-build
    const offenders: string[] = [];
    for (const f of walk(distCore)) {
      if (!f.endsWith('.d.ts') && !f.endsWith('.d.cts')) continue;
      const src = readFileSync(f, 'utf8');
      if (/\bNodeJS\.|['"]node:/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
