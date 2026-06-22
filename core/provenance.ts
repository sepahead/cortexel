// Cortexel honesty model — fail-closed provenance.
//
// Every rendered visualization carries provenance describing where its data came
// from and which scientific-honesty boundaries apply. The defaults are the most
// conservative values: an under-specified spec is treated as illustrative and NOT
// paper-local evidence, so the renderer always shows a caption unless the caller
// explicitly clears every flag. This mirrors the project-wide discriminators
// (`calibrated_posterior=false`, `advisory_only`, `is_paper_local_evidence=false`).

export interface ProvenanceMetadata {
  /** Origin of the data: a nest_simulation id, a paper id, or synthetic_test. */
  source: string;
  /** True ONLY when a calibrated Bayesian posterior backs the figure. Never set
   *  by the current pipeline — validation/search is candidate ranking. */
  calibrated_posterior: boolean;
  /** True when the figure is advisory evidence only (does not mutate state). */
  advisory_only: boolean;
  /** True only when the data is paper-local evidence (not corpus/global KG). */
  is_paper_local_evidence: boolean;
  /** Optional human-readable caption (e.g. "Illustrative — not measured"). */
  caption?: string;
  /** Explicit synthetic/illustrative flag — forces the schematic caption. */
  synthetic?: boolean;
}

export const CONSERVATIVE_PROVENANCE: Readonly<
  Pick<
    ProvenanceMetadata,
    'calibrated_posterior' | 'advisory_only' | 'is_paper_local_evidence'
  >
> = Object.freeze({
  calibrated_posterior: false,
  advisory_only: false,
  is_paper_local_evidence: false,
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

/** Default caption text when none is supplied but a caption is required. */
export function defaultHonestyCaption(p: ProvenanceMetadata): string {
  if (p.caption) return p.caption;
  if (p.synthetic || p.source === 'synthetic_test' || p.source.startsWith('synthetic')) {
    return 'Schematic — illustrative synthetic data, not measured.';
  }
  if (!p.is_paper_local_evidence) {
    return 'Advisory — not paper-local evidence; candidate ranking only.';
  }
  return 'Illustrative — not a calibrated posterior.';
}
