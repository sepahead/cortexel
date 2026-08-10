import {
  Component,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import type { ReadonlySemanticPalette } from '../core/colormaps';
import {
  KnowledgeGraphCorpus3DSceneInternal,
  type ControlsHandle,
} from './KnowledgeGraph3DScene';
import {
  KnowledgeGraphCorpusFrameInternal,
  type KnowledgeGraphCorpusFrameContextInternal,
  type KnowledgeGraphViewPolicyV1,
} from './KnowledgeGraphCorpusFrame.internal';
import type { KnowledgeGraphFigureHostPolicyV1 } from './knowledgeGraphFigure';

interface VisualBoundaryProps {
  /** Exact presentation or subordinate view rendered by the failed visual. */
  readonly resetToken: object;
  readonly retryToken: string | number | undefined;
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface VisualBoundaryState {
  readonly failed: boolean;
}

class KnowledgeGraphVisualBoundary extends Component<
  VisualBoundaryProps,
  VisualBoundaryState
> {
  override state: VisualBoundaryState = { failed: false };

  static getDerivedStateFromError(): VisualBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Deliberately opaque: a host may wrap the figure with its own telemetry.
    // React error boundaries cover descendant client render/lifecycle failures;
    // they do not cover SSR, event handlers, asynchronous work, or WebGL context
    // loss that the host has not converted into visualAvailable=false.
  }

  override componentDidUpdate(previous: VisualBoundaryProps): void {
    if (
      (previous.resetToken !== this.props.resetToken ||
        !Object.is(previous.retryToken, this.props.retryToken)) &&
      this.state.failed
    ) {
      this.setState({ failed: false });
    }
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface VisualMountProps {
  readonly renderVisual: KnowledgeGraphVisualRenderer;
  readonly scene: ReactElement;
  readonly context: KnowledgeGraphVisualHostContextV1;
}

function KnowledgeGraphVisualMount({ renderVisual, scene, context }: VisualMountProps) {
  return <>{renderVisual(scene, context)}</>;
}

export type KnowledgeGraphVisualHostContextV1 = KnowledgeGraphFigureHostPolicyV1;
export type KnowledgeGraphVisualRenderer = (
  scene: ReactElement,
  context: KnowledgeGraphVisualHostContextV1,
) => ReactNode;

export interface KnowledgeGraphAccessibleFigureCommonProps {
  /**
   * Invoked synchronously (including during SSR) with the checked scene and host
   * policy. The host owns Canvas/client boundaries, controls/camera application,
   * frameloop, assets, postprocessing, context-loss detection, and errors outside
   * React descendant render/lifecycle work.
   */
  readonly renderVisual: KnowledgeGraphVisualRenderer;
  readonly selectedId: string | null;
  /** Receives null when a source/view transition invalidates controlled selection. */
  readonly onSelect: (id: string | null) => void;
  readonly hoverId: string | null;
  readonly onHover: (id: string | null) => void;
  /**
   * Set false when the host detects that its visual surface is unavailable
   * (including WebGL/context failures that React cannot observe).
   */
  readonly visualAvailable?: boolean;
  /** Increment/change after repairing a failed host visual without replacing spec. */
  readonly visualRetryKey?: string | number;
  /** Strict host-owned kind filters; omission means the complete prepared graph. */
  readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
  readonly query?: string;
  readonly controlsRef?: RefObject<ControlsHandle | null>;
  /** Defaults true for the canonical composition; set false to retain host camera. */
  readonly autoFrame?: boolean;
  readonly flyToSelection?: boolean;
  readonly labelColor?: string;
  readonly particleColor?: string;
  /** Static by default; opt into continuous flow-marker motion explicitly. */
  readonly flowMotion?: 'static' | 'animated';
  readonly reducedMotion?: boolean;
  readonly nodePageSize?: number;
  readonly recordNodePageSize?: number;
  readonly recordEdgePageSize?: number;
  readonly activePalette?: ReadonlySemanticPalette;
  readonly className?: string;
  readonly label?: string;
}

export type KnowledgeGraphAccessibleFigureProps =
  KnowledgeGraphAccessibleFigureCommonProps & (
    | {
        /** Materialized self-describing legacy VizSpec; duplicates are no longer observable. */
        readonly spec: unknown;
        readonly specJson?: never;
      }
    | {
        /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
        readonly spec?: never;
        readonly specJson: string;
      }
  );

interface KnowledgeGraphInteractiveRegionProps {
  readonly context: KnowledgeGraphCorpusFrameContextInternal;
  readonly renderVisual: KnowledgeGraphVisualRenderer;
  readonly visualAvailable: boolean;
  readonly visualRetryKey: string | number | undefined;
  readonly controlsRef: RefObject<ControlsHandle | null> | undefined;
  readonly autoFrame: boolean;
  readonly flyToSelection: boolean | undefined;
  readonly labelColor: string | undefined;
  readonly particleColor: string | undefined;
  readonly flowMotion: 'static' | 'animated' | undefined;
  readonly reducedMotion: boolean | undefined;
  readonly query: string;
}

function KnowledgeGraphInteractiveRegion({
  context,
  renderVisual,
  visualAvailable,
  visualRetryKey,
  controlsRef,
  autoFrame,
  flyToSelection,
  labelColor,
  particleColor,
  flowMotion,
  reducedMotion,
  query,
}: KnowledgeGraphInteractiveRegionProps) {
  const {
    presentation,
    view,
    hostPolicy,
    activeToken,
    selectedId,
    onSelect,
    hoverId,
    onHover,
  } = context;
  if (onHover === undefined) {
    throw new Error('interactive knowledge-graph hover controller invariant failed');
  }
  const visualUnavailableStatus = (
    <p role="status">
      The host-owned interactive 3D view is unavailable. The paginated graph-record
      browser remains below; its controls expose every accepted record after hydration.
    </p>
  );
  const { liveForceAvailability } = hostPolicy;
  const liveForceAvailable = liveForceAvailability.status === 'available';
  const liveForceLimitStatus = (
    <p role="status">
      The host-owned interactive 3D force view was not mounted: this active view has{' '}
      {liveForceAvailability.nodeCount} nodes and {liveForceAvailability.edgeCount}{' '}
      relationships; the reviewed main-thread ceiling is{' '}
      {liveForceAvailability.maxNodes} nodes and {liveForceAvailability.maxEdges}{' '}
      relationships. If an available exact kind filter reduces this source below the
      ceiling, that filtered view can mount the visual; some single-kind sources have
      no nonempty eligible view. The bound caption, legend, interactive DOM controls,
      and paginated source-record browser remain below; after hydration the browser
      controls expose every accepted source record.
    </p>
  );
  const scene = liveForceAvailable ? (
    <KnowledgeGraphCorpus3DSceneInternal
      presentation={presentation}
      view={view}
      selectedId={selectedId}
      query={query}
      onSelect={onSelect}
      hoverId={hoverId}
      onHover={onHover}
      controlsRef={controlsRef}
      autoFrame={autoFrame}
      flyToSelection={flyToSelection}
      labelColor={labelColor}
      particleColor={particleColor}
      flowMotion={flowMotion}
      themeMode={hostPolicy.themeMode}
      reducedMotion={reducedMotion}
    />
  ) : null;
  return visualAvailable && liveForceAvailable && scene !== null ? (
    <KnowledgeGraphVisualBoundary
      resetToken={activeToken}
      retryToken={visualRetryKey}
      fallback={visualUnavailableStatus}
    >
      <KnowledgeGraphVisualMount
        renderVisual={renderVisual}
        scene={scene}
        context={hostPolicy}
      />
    </KnowledgeGraphVisualBoundary>
  ) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus;
}

/**
 * Canonical legacy 3D corpus-graph composition. It binds strict validation,
 * mapping, caption, legend, interactive DOM controls, and a paginated record
 * view to one detached presentation. Unit tests establish those narrow
 * composition invariants only—not whole-figure WCAG, browser, WebGL, or
 * assistive-technology conformance.
 */
export function KnowledgeGraphAccessibleFigure(
  props: KnowledgeGraphAccessibleFigureProps,
) {
  const {
    renderVisual,
    selectedId,
    onSelect,
    hoverId,
    onHover,
    visualAvailable = true,
    visualRetryKey,
    viewPolicy,
    query = '',
    controlsRef,
    autoFrame = true,
    flyToSelection,
    labelColor,
    particleColor,
    flowMotion,
    reducedMotion,
    nodePageSize,
    recordNodePageSize,
    recordEdgePageSize,
    activePalette,
    className,
    label = 'Interactive knowledge graph',
  } = props;
  return (
    <KnowledgeGraphCorpusFrameInternal
      sourceInput={props}
      selectionController={{ value: selectedId, onChange: onSelect }}
      hoverController={{ value: hoverId, onChange: onHover }}
      viewPolicy={viewPolicy}
      query={query}
      nodePageSize={nodePageSize}
      recordNodePageSize={recordNodePageSize}
      recordEdgePageSize={recordEdgePageSize}
      activePalette={activePalette}
      className={className}
      label={label}
      renderPrimaryRegion={(context) => (
        <KnowledgeGraphInteractiveRegion
          context={context}
          renderVisual={renderVisual}
          visualAvailable={visualAvailable}
          visualRetryKey={visualRetryKey}
          controlsRef={controlsRef}
          autoFrame={autoFrame}
          flyToSelection={flyToSelection}
          labelColor={labelColor}
          particleColor={particleColor}
          flowMotion={flowMotion}
          reducedMotion={reducedMotion}
          query={query}
        />
      )}
    />
  );
}
