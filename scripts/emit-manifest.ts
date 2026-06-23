// Emits dist/skills.manifest.json — the language-neutral artifact non-TS hosts
// (a host Python backend; future agents) consume as the single source of the
// skill→scene map + input/provenance contract. Zod schemas are serialized as
// their required-key LISTS, not zod internals, so the manifest stays portable.
//
// buildManifest() is pure (no fs) so a Vitest guard can assert the committed
// dist file is byte-identical to a fresh in-memory emit. emit() writes the file.
// Run AFTER tsup (tsup's clean:true would otherwise wipe dist/).

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SCENE_NAMES } from '../core/designLaws';
import { PROVENANCE_KEYS } from '../core/skills/provenanceKeys';
import {
  NEST_SKILL_IDS,
  VALID_RENDERER_ROUTES,
  NEST_DEVICE_FAMILIES,
  VIZ_ROUTER_ID,
} from '../core/skills/skillIds';
import { CORTEXEL_SKILL_VERSION, NEST_SKILL_REGISTRY } from '../core/skills/registry';

export interface SkillManifestEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  deviceFamily: string;
  scene: string | null;
  weak: boolean;
  requiredInputKeys: string[];
  requiredProvenanceKeys: string[];
  rendererRoutes: string[];
  examples: {
    nestExample: string;
    sourceUrl: string;
    dataShape: string;
    output: string;
    note: string;
  }[];
}

export interface SkillsManifest {
  manifestVersion: string;
  skillAxisVersion: string;
  vizRouterId: string;
  sceneNames: string[];
  provenanceKeys: string[];
  deviceFamilies: string[];
  validRendererRoutes: string[];
  skills: SkillManifestEntry[];
}

export function buildManifest(): SkillsManifest {
  const skills: SkillManifestEntry[] = NEST_SKILL_IDS.map((id) => {
    const c = NEST_SKILL_REGISTRY[id];
    return {
      id: c.id,
      version: c.version,
      title: c.title,
      description: c.description,
      deviceFamily: c.deviceFamily,
      scene: c.scene,
      weak: c.weak ?? false,
      requiredInputKeys: [...c.requiredInputKeys],
      requiredProvenanceKeys: [...c.requiredProvenanceKeys],
      rendererRoutes: [...c.rendererRoutes],
      examples: c.examples.map((e) => ({ ...e })),
    };
  });
  return {
    manifestVersion: '1',
    skillAxisVersion: CORTEXEL_SKILL_VERSION,
    vizRouterId: VIZ_ROUTER_ID,
    sceneNames: [...SCENE_NAMES],
    provenanceKeys: [...PROVENANCE_KEYS],
    deviceFamilies: [...NEST_DEVICE_FAMILIES],
    validRendererRoutes: [...VALID_RENDERER_ROUTES],
    skills,
  };
}

/** Deterministic, stable serialization (2-space indent + trailing newline). */
export function serializeManifest(m: SkillsManifest = buildManifest()): string {
  return JSON.stringify(m, null, 2) + '\n';
}

async function emit(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, '..', 'dist', 'skills.manifest.json');
  await writeFile(out, serializeManifest(), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[cortexel] wrote ${out}`);
}

// Run when invoked directly (tsx scripts/emit-manifest.ts), not when imported.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  emit().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
