import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import {
  canonicalDigest,
  canonicalDigestExcluding,
  canonicalize,
} from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';
import { validateStructure } from '../src/core/structural-validator.js';
import { SKILL_CATALOG, STABLE_SKILL_IDS } from '../src/generated/catalog.js';
import { buildFigure } from '../src/render/buildFigure.js';

const root = path.resolve(import.meta.dirname, '..');
const presentationDefaults = {
  themeId: 'light',
  width: 720,
  height: 440,
  budgetProfile: 'standard',
} as const;

const readJson = (relative: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(root, relative), 'utf8')) as Record<string, unknown>;

function makeArtifactValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
    allowUnionTypes: true,
    validateFormats: false,
  });
  ajv.addSchema(readJson('contract/schemas/common.v1.schema.json'));
  ajv.addSchema(readJson('contract/schemas/generated/registry-enums.v1.schema.json'));
  ajv.addSchema(readJson('contract/schemas/validation-error.v1.schema.json'));
  for (const name of readdirSync(path.join(root, 'contract/schemas/skills'))
    .filter((file) => file.endsWith('.request.v1.schema.json'))
    .sort()) {
    ajv.addSchema(readJson(`contract/schemas/skills/${name}`));
  }
  ajv.addSchema(readJson('contract/schemas/stable-figure-request-union.v1.schema.json'));
  return ajv.compile(readJson('contract/schemas/figure-artifact.v1.schema.json'));
}

const validateArtifact = makeArtifactValidator();

interface SkillCase {
  readonly id: string;
  readonly revision: number;
  readonly request: Record<string, unknown>;
}

const skills: readonly SkillCase[] = STABLE_SKILL_IDS.map((id) => {
  const source = JSON.parse(
    readFileSync(path.join(root, 'contract', 'skills', `${id}.v1.json`), 'utf8'),
  ) as { examples: { valid: Record<string, unknown>[] } };
  const request = structuredClone(source.examples.valid[0]);
  const skill = request.skill as Record<string, unknown>;
  delete skill.revision;
  return { id, revision: SKILL_CATALOG[id].revision, request };
});

function accepted(request: Record<string, unknown>) {
  const outcome = validateRequestValue(request);
  if (!outcome.ok) {
    throw new Error(
      outcome.errors
        .map((error) => `${error.code} ${error.instancePath}: ${error.message}`)
        .join('\n'),
    );
  }
  return outcome.request;
}

function rendered(request: Record<string, unknown>) {
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(
      result.errors
        .map((error) => `${error.code} ${error.instancePath}: ${error.message}`)
        .join('\n'),
    );
  }
  return result;
}

/** Reconstruct the pre-repair representation to pin the intentional identity break. */
function formerlyCanonical(request: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(request);
  const presentation = (copy.presentation ?? {}) as Record<string, unknown>;
  return {
    ...copy,
    presentation: { ...presentationDefaults, ...presentation },
  };
}

function skillIdentity(request: Record<string, unknown>): Record<string, unknown> {
  return request.skill as Record<string, unknown>;
}

describe('resolved skill identity is part of every accepted canonical request', () => {
  it('covers the complete installed stable catalog', () => {
    expect(skills.map(({ id }) => id)).toEqual(STABLE_SKILL_IDS);
    expect(skills).toHaveLength(19);
  });

  describe.each(skills)('$id revision $revision', ({ id, revision, request }) => {
    it('gives an omitted pin and an explicit-current pin identical canonical identity', () => {
      const unpinned = structuredClone(request);
      const pinned = structuredClone(request);
      skillIdentity(pinned).revision = revision;
      const authoredUnpinnedBefore = structuredClone(unpinned);
      const authoredPinnedBefore = structuredClone(pinned);

      const unpinnedToken = accepted(unpinned);
      const pinnedToken = accepted(pinned);

      // Validation snapshots its input and canonicalization creates a fresh skill object.
      // Neither authored form is rewritten into an output envelope in place.
      expect(unpinned).toEqual(authoredUnpinnedBefore);
      expect(pinned).toEqual(authoredPinnedBefore);

      expect(unpinnedToken.skillId).toBe(id);
      expect(unpinnedToken.skillRevision).toBe(revision);
      expect(skillIdentity(unpinnedToken.canonicalRequest)).toEqual({ id, revision });
      expect(pinnedToken.skillRevision).toBe(revision);
      expect(skillIdentity(pinnedToken.canonicalRequest)).toEqual({ id, revision });

      expect(unpinnedToken.canonicalRequest).toEqual(pinnedToken.canonicalRequest);
      expect(canonicalize(unpinnedToken.canonicalRequest)).toBe(
        canonicalize(pinnedToken.canonicalRequest),
      );
      expect(unpinnedToken.requestDigest).toBe(pinnedToken.requestDigest);
      expect(unpinnedToken.requestDigest).toBe(
        canonicalDigest(unpinnedToken.canonicalRequest),
      );

      // The repair intentionally changes formerly-unpinned identity. An explicit-current
      // request already carried this exact field, so its pre-repair canonical bytes stay
      // stable. The request contract remains optional at the authored boundary.
      expect(unpinnedToken.requestDigest).not.toBe(
        canonicalDigest(formerlyCanonical(unpinned)),
      );
      expect(canonicalize(pinnedToken.canonicalRequest)).toBe(
        canonicalize(formerlyCanonical(pinned)),
      );

      expect(validateStructure(unpinnedToken.canonicalRequest, id).ok).toBe(true);
      const revalidated = accepted(unpinnedToken.canonicalRequest);
      expect(revalidated.canonicalRequest).toEqual(unpinnedToken.canonicalRequest);
      expect(revalidated.requestDigest).toBe(unpinnedToken.requestDigest);
      expect(Object.isFrozen(unpinnedToken.canonicalRequest)).toBe(true);
      expect(Object.isFrozen(unpinnedToken.canonicalRequest.skill as object)).toBe(true);
    });

    it.each([
      ['prior', revision - 1],
      ['future', revision + 1],
    ] as const)('refuses a %s revision before structural repair or canonicalization', (_name, pin) => {
      const mismatched = structuredClone(request);
      skillIdentity(mismatched).revision = pin;
      // A second, structural defect proves identity refusal has precedence. In
      // particular, a revision-1 prior pin of 0 is still refused as an unsupported
      // installed identity before the authored schema's minimum can run.
      delete mismatched.data;
      const before = structuredClone(mismatched);

      const outcome = validateRequestValue(mismatched);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.errors.map((error) => ({
        code: error.code,
        stage: error.stage,
        instancePath: error.instancePath,
      }))).toEqual([{
        code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
        stage: 'identity',
        instancePath: '/skill/revision',
      }]);
      expect(mismatched).toEqual(before);
    });

    it('stamps one canonical skill identity and the independent renderer identity', () => {
      const unpinned = structuredClone(request);
      const pinned = structuredClone(request);
      skillIdentity(pinned).revision = revision;

      const unpinnedFigure = rendered(unpinned);
      const pinnedFigure = rendered(pinned);
      const artifact = unpinnedFigure.artifact as Record<string, any>;

      expect(unpinnedFigure.svg).toBe(pinnedFigure.svg);
      expect(unpinnedFigure.artifact).toEqual(pinnedFigure.artifact);
      expect(skillIdentity(artifact.canonicalRequest)).toEqual({ id, revision });
      expect(artifact).not.toHaveProperty('skillIdentity');
      expect(artifact).not.toHaveProperty('skillId');
      expect(artifact).not.toHaveProperty('skillRevision');
      expect(artifact.render).toMatchObject({
        rendererId: SKILL_CATALOG[id].renderer.id,
        rendererRevision: SKILL_CATALOG[id].renderer.revision,
      });
      expect(validateArtifact(artifact), JSON.stringify(validateArtifact.errors)).toBe(true);

      const requestDigest = canonicalDigest(artifact.canonicalRequest);
      expect(artifact.provenance.requestDigest).toBe(requestDigest);
      expect(unpinnedFigure.svg).toContain(
        `<cortexel:requestDigest>${requestDigest}</cortexel:requestDigest>`,
      );
      expect(artifact.artifactDigest).toBe(
        canonicalDigestExcluding(artifact, 'artifactDigest'),
      );

      // Artifact 1.0 has no detached verifier. Demonstrate the recomputation a future
      // reader would have to perform rather than implying structural schema validation
      // authenticates these digests.
      const mutated = structuredClone(artifact);
      skillIdentity(mutated.canonicalRequest).revision = revision + 1;
      // The schema still describes an authored FigureRequestV1 and intentionally does
      // not contain the installed catalog as validation state. Shape alone therefore
      // remains valid and is not a substitute for recomputation or writer authority.
      expect(validateArtifact(mutated), JSON.stringify(validateArtifact.errors)).toBe(true);
      expect(canonicalDigest(mutated.canonicalRequest)).not.toBe(
        mutated.provenance.requestDigest,
      );
      expect(canonicalDigestExcluding(mutated, 'artifactDigest')).not.toBe(
        mutated.artifactDigest,
      );

      // Later caller mutation cannot rewrite the already detached artifact identity.
      skillIdentity(unpinned).revision = revision + 1;
      expect(skillIdentity(artifact.canonicalRequest)).toEqual({ id, revision });
      expect(artifact.provenance.requestDigest).toBe(requestDigest);
    });
  });
});
