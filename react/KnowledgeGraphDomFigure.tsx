import type { ReadonlySemanticPalette } from '../core/colormaps';
import {
  KnowledgeGraphCorpusFrameInternal,
  type KnowledgeGraphCorpusFigureInputInternal,
  type KnowledgeGraphViewPolicyV1,
} from './KnowledgeGraphCorpusFrame.internal';

export interface KnowledgeGraphDomFigureCommonProps {
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

export type KnowledgeGraphDomFigureProps = KnowledgeGraphDomFigureCommonProps &
  KnowledgeGraphCorpusFigureInputInternal;

function renderDomOnlyStatus() {
  return (
    <p role="status">
      DOM-only knowledge graph inspection: this entry mounts no Canvas, WebGL, or
      force layout. Its paginated controls expose every accepted source record after
      hydration. Without client-side JavaScript, only the bounded initial node and
      relationship pages are present.
    </p>
  );
}

/**
 * Low-friction, React-only corpus graph inspection. The strict legacy VizSpec gate
 * derives the visible caption and the private presentation capability; callers
 * cannot replace either or inject a renderer. Selection is owned by this component
 * and resets when the exact source/view capability changes.
 *
 * This experimental DOM composition is not a FigureRequest artifact, evidence
 * authenticator, deterministic HTML receipt, or WCAG/assistive-technology claim.
 */
export function KnowledgeGraphDomFigure(props: KnowledgeGraphDomFigureProps) {
  const {
    viewPolicy,
    query,
    nodePageSize,
    recordNodePageSize,
    recordEdgePageSize,
    activePalette,
    className,
  } = props;
  return (
    <KnowledgeGraphCorpusFrameInternal
      sourceInput={props}
      viewPolicy={viewPolicy}
      query={query}
      nodePageSize={nodePageSize}
      recordNodePageSize={recordNodePageSize}
      recordEdgePageSize={recordEdgePageSize}
      activePalette={activePalette}
      className={className}
      label="Knowledge graph records"
      renderPrimaryRegion={renderDomOnlyStatus}
    />
  );
}
