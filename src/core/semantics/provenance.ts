/**
 * The authority boundary.
 *
 * This is the single most important rule in Cortexel, so it is enforced first,
 * on the RAW request, before normalization, before defaults, before the schema —
 * so a forbidden field cannot be smuggled in through a default or hidden behind a
 * different failure.
 *
 * **A caller declares what its data IS. It never declares what Cortexel concluded
 * about it.**
 *
 * A caller may say "this came from a NEST simulation" — that is a claim about the
 * world, and the caller is the only one who knows it. A caller may NOT say "this
 * was validated", "this matches the reference implementation", "this figure is
 * accessible", "this network snapshot is complete", or "this posterior is
 * calibrated" — those are conclusions, and a system in which the subject writes
 * its own conclusions has no conclusions at all.
 *
 * Note that closing the schema (`additionalProperties: false`) would already
 * reject these fields as unknown properties. That is not good enough. An agent
 * that sets `validation: {passed: true}` and receives "unknown property" has been
 * told it made a typo. It needs to be told it attempted something the contract
 * does not permit anyone to do — so this check runs first and wins.
 */

import { makeError, isSafeDisplayString, pointer, type CortexelError } from '../errors.js';
import type { SemanticContext, SemanticValidator } from './types.js';

/**
 * Field names only Cortexel may author.
 *
 * Two groups. The first is the FigureArtifactV1 surface: if a caller could set
 * these, an artifact would no longer be a record of what happened. The second is
 * the pre-1.0 honesty vocabulary — `calibrated_posterior`, `advisory_only`,
 * `is_paper_local_evidence` — which let a caller shape statements the library
 * should have been the sole author of. They are named explicitly so the diagnostic
 * can say why they are gone rather than merely that they are unknown.
 */
const LIBRARY_AUTHORED_FIELDS = new Set([
  // FigureArtifactV1 — library-generated, never caller-settable.
  'artifact',
  'artifactDigest',
  'buildIdentity',
  'canonicalRequest',
  'inputAssurance',
  'validation',
  'derivation',
  'budgetDecision',
  'assurance',
  'assurances',
  'attestations',
  'disclosures',
  'render',
  'accessibility',
  'outputs',
  'catalogDigest',

  // Pre-1.0 honesty flags. Removed, not renamed: they let a caller influence a
  // conclusion, which is the defect, and a new spelling would not fix it.
  'calibrated_posterior',
  'calibratedPosterior',
  'advisory_only',
  'advisoryOnly',
  'is_paper_local_evidence',
  'isPaperLocalEvidence',
  'honesty',
  'trustedEnvelope',

  // Assertions of a conclusion, in any spelling an agent might reach for.
  'verified',
  'certified',
  'validated',
  'reproduced',
  'conformant',
  'referenceComparison',
  'sourceContentVerified',
  'signatureVerified',
]);

/** Walk the request and report every attempt to author a library conclusion. */
function findLibraryAuthoredFields(
  node: unknown,
  path: (string | number)[],
  found: CortexelError[],
  depth: number,
): void {
  if (depth > 64 || node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      path.push(i);
      findLibraryAuthoredFields(node[i], path, found, depth + 1);
      path.pop();
    }
    return;
  }

  for (const key of Object.keys(node as Record<string, unknown>)) {
    if (LIBRARY_AUTHORED_FIELDS.has(key)) {
      const at = pointer(...path, key);
      found.push(
        makeError({
          code: 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
          stage: 'provenance',
          instancePath: at,
          validatorId: 'provenance.no_caller_assurance',
          message: `"${key}" is a fact Cortexel generates, not one a caller may declare. A request states what the data IS; it cannot state what Cortexel concluded about it. Remove the field — the conclusion will appear in the artifact if it is earned.`,
          repair: {
            operation: 'remove',
            path: at,
            reasonCode: 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
          },
        }),
      );
      // Do not descend: the whole subtree is forbidden, and one clear error beats
      // twenty about its children.
      continue;
    }

    path.push(key);
    findLibraryAuthoredFields(
      (node as Record<string, unknown>)[key],
      path,
      found,
      depth + 1,
    );
    path.pop();
  }
}

export const provenanceNoCallerAssurance: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const found: CortexelError[] = [];
  findLibraryAuthoredFields(context.request, [], found, 0);
  return found;
};

const MAX_NOTE_LENGTH = 200;

/**
 * A caller note is allowed — attributed, unverified, and unable to displace
 * anything.
 *
 * The characters banned here are not a style preference. A bidi override inside a
 * caption can make the rendered text read in a different order than the source
 * says, and a zero-width joiner can hide a word entirely. Beside a MANDATORY
 * disclosure, that is not a typography problem; it is a way to make the disclosure
 * say something else.
 */
export const provenanceNoteSafeDisplay: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const source = (context.request as { source?: Record<string, unknown> }).source;
  if (!source || typeof source !== 'object') return [];

  const errors: CortexelError[] = [];

  const check = (value: unknown, at: string): void => {
    if (typeof value !== 'string') return;
    if (value.length > MAX_NOTE_LENGTH) {
      errors.push(
        makeError({
          code: 'PROVENANCE_NOTE_TOO_LONG',
          stage: 'provenance',
          instancePath: at,
          validatorId: 'provenance.note_safe_display',
          message: `a declared note may be at most ${MAX_NOTE_LENGTH} characters; this one is ${value.length}.`,
        }),
      );
    }
    if (!isSafeDisplayString(value)) {
      errors.push(
        makeError({
          code: 'PROVENANCE_NOTE_UNSAFE_DISPLAY',
          stage: 'provenance',
          instancePath: at,
          validatorId: 'provenance.note_safe_display',
          message:
            'the note contains control, bidi-override, or zero-width characters. Rendered beside a mandatory disclosure, those can visually reorder or conceal it — so they are rejected rather than escaped.',
        }),
      );
    }
  };

  check(source.declaredNote, pointer('source', 'declaredNote'));

  const limitations = source.declaredLimitations;
  if (Array.isArray(limitations)) {
    limitations.forEach((limitation, index) => {
      check(limitation, pointer('source', 'declaredLimitations', index));
    });
  }

  return errors;
};
