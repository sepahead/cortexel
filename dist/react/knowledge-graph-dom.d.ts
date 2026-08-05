import { k as ReadonlySemanticPalette } from "../vizSpec-DXKitvuD.js";
import { n as KnowledgeGraphViewPolicyV1, t as KnowledgeGraphCorpusFigureInputInternal } from "../KnowledgeGraphCorpusFrame.internal-DngsoYeo.js";
//#region react/KnowledgeGraphDomFigure.d.ts
interface KnowledgeGraphDomFigureCommonProps {
  /** Strict source-bound kind filters; omission means the complete graph. */
  readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
  /** Query matches are navigable emphasis metadata; they do not filter records. */
  readonly query?: string;
  readonly nodePageSize?: number;
  readonly recordNodePageSize?: number;
  readonly recordEdgePageSize?: number;
  /** Trusted host fallback used only when the validated spec has no palette hint. */
  readonly activePalette?: ReadonlySemanticPalette;
  readonly className?: string;
}
type KnowledgeGraphDomFigureProps = KnowledgeGraphDomFigureCommonProps & KnowledgeGraphCorpusFigureInputInternal;
/**
 * Low-friction, React-only corpus graph inspection. The strict legacy VizSpec gate
 * derives the visible caption and the private presentation capability; callers
 * cannot replace either or inject a renderer. Selection is owned by this component
 * and resets when the exact source/view capability changes.
 *
 * This experimental DOM composition is not a FigureRequest artifact, evidence
 * authenticator, deterministic HTML receipt, or WCAG/assistive-technology claim.
 */
declare function KnowledgeGraphDomFigure(props: KnowledgeGraphDomFigureProps): import("react").JSX.Element;
//#endregion
export { KnowledgeGraphDomFigure, type KnowledgeGraphDomFigureCommonProps, type KnowledgeGraphDomFigureProps, type KnowledgeGraphViewPolicyV1 };
