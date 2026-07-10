// Cortexel honesty model — fail-closed provenance.
//
// Every rendered visualization carries provenance describing where its data came
// from and which scientific-honesty boundaries apply. The defaults are the most
// conservative values: an under-specified spec is treated as illustrative and NOT
// paper-local evidence, so the renderer always shows a caption unless the caller
// explicitly clears every flag. This mirrors the project-wide discriminators
// (`calibrated_posterior=false`, `advisory_only=true`,
// `is_paper_local_evidence=false`).

import type { VizSpec } from './vizSpec';
import { safeDiagnosticText } from './safeRuntime';

/** The runtime-validated provenance shape. Derived from VizSpec so the React
 *  render boundary and honesty helpers cannot drift from the Zod contract. */
export type ProvenanceMetadata = VizSpec['provenance'];

export const CONSERVATIVE_PROVENANCE: Readonly<
  Pick<
    ProvenanceMetadata,
    | 'calibrated_posterior'
    | 'advisory_only'
    | 'is_paper_local_evidence'
    | 'synthetic'
  >
> = Object.freeze({
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: false,
});

/** Language-neutral caption derivation contract, emitted in the manifest. */
export const HONESTY_POLICY = Object.freeze({
  version: '2',
  calibratedPosteriorAccepted: false,
  captionRequiredWhenAny: Object.freeze([
    'synthetic=true',
    'calibrated_posterior=false',
    'advisory_only=true',
    'is_paper_local_evidence=false',
  ]),
  syntheticSourceMatch: Object.freeze({
    caseInsensitive: true,
    equals: Object.freeze(['synthetic_test']),
    prefixes: Object.freeze(['synthetic']),
  }),
  precedence: Object.freeze([
    'synthetic',
    'advisory_only',
    'not_paper_local',
    'not_calibrated',
  ]),
  templates: Object.freeze({
    synthetic: 'Schematic — illustrative synthetic data, not measured.',
    advisory_only: 'Advisory — advisory evidence only; not a calibrated posterior.',
    not_paper_local: 'Advisory — not paper-local evidence; candidate ranking only.',
    not_calibrated: 'Illustrative — not a calibrated posterior.',
  }),
  callerCaption: 'append_only_unverified',
  callerCaptionLabel: 'Caller note (unverified):',
  callerCaptionControls: 'escape C0/C1, bidi, zero-width, and BOM controls',
  bidiIsolationRequired: true,
  weakSkillDisclosure: 'prepend',
});

/**
 * Whether the renderer must show a non-dismissible "illustrative / not measured"
 * honesty caption. Fail-closed: any non-rigorous flag forces the caption on.
 */
export function requiresHonestyCaption(p: ProvenanceMetadata): boolean {
  return (
    !!p.synthetic ||
    !p.calibrated_posterior ||
    p.advisory_only ||
    !p.is_paper_local_evidence
  );
}

/**
 * The mandatory disclosure computed from the provenance FLAGS. This is the
 * load-bearing honesty text: it is derived only from the machine-checkable flags
 * (never from caller-supplied free text) so an agent cannot re-label synthetic or
 * advisory data as measured. Precedence: synthetic → schematic; advisory-only →
 * advisory; non-paper-local → advisory; then the residual posterior disclosure.
 */
export function mandatoryDisclosure(p: ProvenanceMetadata): string {
  if (
    p.synthetic ||
    p.source.toLowerCase() === 'synthetic_test' ||
    p.source.toLowerCase().startsWith('synthetic')
  ) {
    return HONESTY_POLICY.templates.synthetic;
  }
  if (p.advisory_only) {
    return HONESTY_POLICY.templates.advisory_only;
  }
  if (!p.is_paper_local_evidence) {
    return HONESTY_POLICY.templates.not_paper_local;
  }
  return HONESTY_POLICY.templates.not_calibrated;
}

/**
 * Caption text when a caption is required. The mandatory disclosure ALWAYS leads;
 * a caller-supplied `caption` is only ever APPENDED as explicitly unverified
 * context, never a replacement. This is deliberate: `provenance.caption` is
 * agent-controllable and content-unchecked (see ProvenanceSchema), so an
 * unlabeled suffix could visibly contradict the disclosure. The disclosure
 * prefix can never be suppressed — the honesty boundary is fail-closed.
 */
export function defaultHonestyCaption(p: ProvenanceMetadata): string {
  const disclosure = mandatoryDisclosure(p);
  const note = p.caption?.trim();
  return note
    ? `${disclosure} Caller note (unverified): ${safeDiagnosticText(note, 500)}`
    : disclosure;
}
