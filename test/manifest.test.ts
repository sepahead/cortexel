import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildManifest, serializeManifest } from '../scripts/emit-manifest';
import { PI_NEST_SKILL_IDS } from '../core/skills/skillIds';
import { SCENE_NAMES } from '../core/designLaws';

const here = dirname(fileURLToPath(import.meta.url));
const distManifest = join(here, '..', 'dist', 'skills.manifest.json');

describe('skills manifest', () => {
  it('covers every skill id', () => {
    const m = buildManifest();
    expect(m.skills.map((s) => s.id).sort()).toEqual([...PI_NEST_SKILL_IDS].sort());
  });

  it('every non-null scene is a real SceneName', () => {
    for (const s of buildManifest().skills) {
      if (s.scene !== null) expect(SCENE_NAMES).toContain(s.scene as never);
    }
  });

  it('committed dist/skills.manifest.json is byte-identical to a fresh emit', () => {
    // Guard against a forgotten rebuild. Skipped pre-build (dist absent).
    if (!existsSync(distManifest)) return;
    const committed = readFileSync(distManifest, 'utf8');
    expect(committed).toBe(serializeManifest());
  });
});
