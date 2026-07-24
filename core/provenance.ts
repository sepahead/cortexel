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
  version: '3',
  calibratedPosteriorAccepted: false,
  captionRequiredWhenAny: Object.freeze([
    'synthetic=true',
    'calibrated_posterior=false',
    'advisory_only=true',
    'is_paper_local_evidence=false',
  ]),
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
  contractDisclosureOrder: Object.freeze([
    'weak_skill',
    'external_provenance',
    'flag_derived_mandatory',
    'caller_note',
  ] as const),
  weakSkillDisclosure: 'contract_owned_first',
  externalProvenanceDisclosure:
    'contract_owned_after_weak_before_flag_derived_mandatory',
  flagDerivedMandatoryDisclosure:
    'derived_only_from_provenance_flags_and_always_before_caller_note',
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
  if (p.synthetic) {
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
 * Default caption text when no skill-owned disclosures are involved. The
 * flag-derived mandatory disclosure leads and a caller-supplied `caption` is
 * only ever APPENDED as explicitly unverified context, never a replacement.
 */
export function defaultHonestyCaption(p: ProvenanceMetadata): string {
  return composeHonestyCaption(p) ?? mandatoryDisclosure(p);
}

/** One fixed composition rule for both strict render gates. Contract-owned
 * disclosures may precede the flag-derived segment; caller text is always last
 * and explicitly unverified. */
export function composeHonestyCaption(
  p: ProvenanceMetadata,
  contractDisclosures: Readonly<{
    weakSkill?: string | null;
    externalProvenance?: string | null;
  }> = {},
): string | null {
  const parts: string[] = [];
  if (contractDisclosures.weakSkill) {
    parts.push(contractDisclosures.weakSkill);
  }
  if (contractDisclosures.externalProvenance) {
    parts.push(contractDisclosures.externalProvenance);
  }
  if (requiresHonestyCaption(p)) {
    parts.push(mandatoryDisclosure(p));
  }
  const note = p.caption?.trim();
  if (note) {
    parts.push(`Caller note (unverified): ${safeDiagnosticText(note, 500)}`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}
