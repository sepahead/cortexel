import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { ReadonlySemanticPalette } from '../core/colormaps';
import { safeDiagnosticText, safeErrorMessage } from '../core/safeRuntime';
import {
  KnowledgeGraphCorpus3DSceneInternal,
  type ControlsHandle,
} from './KnowledgeGraph3DScene';
import {
  KnowledgeGraphCorpusA11yListInternal,
  KnowledgeGraphCorpusLegendInternal,
} from './KnowledgeGraphA11yList';
import { KnowledgeGraphCorpusStaticRecordViewInternal } from
  './KnowledgeGraphStaticRecordView';
import { knowledgeGraphLiveForceAvailability } from './knowledgeGraph';
import {
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  type KnowledgeGraphFigureHostPolicyV1,
  type PrepareCorpusKnowledgeGraphFigureResultV1,
} from './knowledgeGraphFigure';
import {
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode,
  prepareKnowledgeGraphView,
  type KnowledgeGraphViewPolicyV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';

interface VisualBoundaryProps {
  /** Exact presentation or subordinate view rendered by the failed visual. */
  readonly resetToken: PreparedKnowledgeGraphPresentationV1 | PreparedKnowledgeGraphViewV1;
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
  /** Host retains Canvas, controls, camera, postprocessing, and asset authority. */
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
  readonly controlsRef?: React.RefObject<ControlsHandle | null>;
  /** Defaults true for the canonical composition; set false to retain host camera. */
  readonly autoFrame?: boolean;
  readonly flyToSelection?: boolean;
  readonly labelColor?: string;
  readonly particleColor?: string;
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
        /** Materialized self-describing legacy VizSpec; duplicate members are no longer observable. */
        readonly spec: unknown;
        readonly specJson?: never;
      }
    | {
        /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
        readonly spec?: never;
        readonly specJson: string;
      }
  );

function inputBoundaryFailure(message: string): PrepareCorpusKnowledgeGraphFigureResultV1 {
  return Object.freeze({
    ok: false as const,
    errors: Object.freeze([Object.freeze({
      code: 'input_boundary_rejected' as const,
      path: 'spec/specJson',
      message,
    })]),
  });
}

/**
 * Canonical legacy corpus-graph composition. It binds strict validation,
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
    reducedMotion,
    nodePageSize,
    recordNodePageSize,
    recordEdgePageSize,
    activePalette,
    className,
    label = 'Interactive knowledge graph',
  } = props;
  const hasSpec = Object.hasOwn(props, 'spec');
  const hasSpecJson = Object.hasOwn(props, 'specJson');
  const spec = hasSpec ? (props as { readonly spec?: unknown }).spec : undefined;
  const specJson = hasSpecJson
    ? (props as { readonly specJson?: unknown }).specJson
    : undefined;
  const preparedSource = useMemo(
    () => {
      if (hasSpec === hasSpecJson) {
        return inputBoundaryFailure(
          'provide exactly one own input property: spec or specJson',
        );
      }
      if (hasSpecJson) {
        if (typeof specJson !== 'string') {
          return inputBoundaryFailure('specJson must be a string');
        }
        return prepareCorpusKnowledgeGraphFigureJson(specJson, { activePalette });
      }
      return prepareCorpusKnowledgeGraphFigure(spec, { activePalette });
    },
    [hasSpec, hasSpecJson, spec, specJson, activePalette],
  );
  const preparedView = useMemo<
    | { readonly ok: true; readonly view: PreparedKnowledgeGraphViewV1 | undefined }
    | { readonly ok: false; readonly message: string }
  >(() => {
    if (!preparedSource.ok || viewPolicy === undefined) {
      return { ok: true, view: undefined };
    }
    try {
      return {
        ok: true,
        view: prepareKnowledgeGraphView(preparedSource.presentation, viewPolicy),
      };
    } catch (error) {
      return {
        ok: false,
        message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`,
      };
    }
  }, [preparedSource, viewPolicy]);
  const hostPolicy = useMemo<KnowledgeGraphFigureHostPolicyV1 | undefined>(
    () => {
      if (!preparedSource.ok || !preparedView.ok) return undefined;
      const activeNodes = preparedView.view?.nodes ?? preparedSource.presentation.nodes;
      const activeEdges = preparedView.view?.edges ?? preparedSource.presentation.edges;
      return Object.freeze({
        ...preparedSource.hostPolicy,
        view: preparedView.view,
        liveForceAvailability: knowledgeGraphLiveForceAvailability(
          activeNodes.length,
          activeEdges.length,
        ),
      });
    },
    [preparedSource, preparedView],
  );
  const captionId = `cortexel-kg-caption-${useId().replace(/:/gu, '')}`;
  const selectionInvalidation = useRef<{
    readonly token: object;
    readonly id: string;
  } | null>(null);
  const hoverInvalidation = useRef<{
    readonly token: object;
    readonly id: string;
  } | null>(null);
  const activeToken = preparedSource.ok && preparedView.ok
    ? preparedView.view ?? preparedSource.presentation
    : undefined;
  const selectedIsInvalid = preparedSource.ok && preparedView.ok &&
    selectedId !== null && !(
    preparedView.view === undefined
      ? knowledgeGraphPresentationContainsNode(preparedSource.presentation, selectedId)
      : knowledgeGraphViewContainsNode(
          preparedView.view,
          preparedSource.presentation,
          selectedId,
        )
  );
  const hoverIsInvalid = preparedSource.ok && preparedView.ok && hoverId !== null && !(
    preparedView.view === undefined
      ? knowledgeGraphPresentationContainsNode(preparedSource.presentation, hoverId)
      : knowledgeGraphViewContainsNode(
          preparedView.view,
          preparedSource.presentation,
          hoverId,
        )
  );
  useEffect(() => {
    if (!selectedIsInvalid || activeToken === undefined || selectedId === null) {
      selectionInvalidation.current = null;
      return;
    }
    const previous = selectionInvalidation.current;
    if (previous?.token === activeToken && previous.id === selectedId) return;
    selectionInvalidation.current = { token: activeToken, id: selectedId };
    onSelect(null);
  }, [activeToken, onSelect, selectedId, selectedIsInvalid]);
  useEffect(() => {
    if (!hoverIsInvalid || activeToken === undefined || hoverId === null) {
      hoverInvalidation.current = null;
      return;
    }
    const previous = hoverInvalidation.current;
    if (previous?.token === activeToken && previous.id === hoverId) return;
    hoverInvalidation.current = { token: activeToken, id: hoverId };
    onHover(null);
  }, [activeToken, hoverId, hoverIsInvalid, onHover]);

  if (!preparedSource.ok) {
    return (
      <section role="alert" aria-label="Invalid knowledge graph figure">
        <h3>Knowledge graph figure rejected</h3>
        <ul>
          {preparedSource.errors.map((error, index) => (
            <li key={index}>{safeDiagnosticText(`${error.path}: ${error.message}`, 840)}</li>
          ))}
        </ul>
      </section>
    );
  }
  if (!preparedView.ok) {
    return (
      <figure
        className={className}
        aria-label={safeDiagnosticText(label, 240)}
        aria-describedby={captionId}
      >
        <figcaption id={captionId}>
          <bdi dir="auto" style={{ unicodeBidi: 'isolate' }}>
            {preparedSource.caption}
          </bdi>
        </figcaption>
        <section role="alert" aria-label="Invalid knowledge graph view policy">
          <h3>Knowledge graph view rejected</h3>
          <p>{safeDiagnosticText(`viewPolicy: ${preparedView.message}`, 840)}</p>
        </section>
        <KnowledgeGraphCorpusStaticRecordViewInternal
          presentation={preparedSource.presentation}
          nodePageSize={recordNodePageSize}
          edgePageSize={recordEdgePageSize}
        />
      </figure>
    );
  }
  if (hostPolicy === undefined) {
    throw new Error('knowledge-graph host policy invariant failed');
  }
  const { caption, presentation } = preparedSource;
  const { view } = preparedView;
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
      themeMode={hostPolicy.themeMode}
      reducedMotion={reducedMotion}
    />
  ) : null;
  return (
    <figure
      className={className}
      aria-label={safeDiagnosticText(label, 240)}
      aria-describedby={captionId}
    >
      <figcaption id={captionId}>
        <bdi dir="auto" style={{ unicodeBidi: 'isolate' }}>{caption}</bdi>
      </figcaption>
      {view !== undefined && (
        <p role="note">
          Filtered view: showing {view.counts.visibleNodes} of {view.counts.sourceNodes}{' '}
          nodes and {view.counts.visibleEdges} of {view.counts.sourceEdges}{' '}
          relationships. Relationships excluded by kind: {' '}
          {view.counts.edgeKindFilteredEdges}; excluded because an endpoint is hidden:{' '}
          {view.counts.endpointPrunedEdges}. The caption and record browser remain bound
          to the full source.
        </p>
      )}
      {visualAvailable && liveForceAvailable && scene !== null ? (
        <KnowledgeGraphVisualBoundary
          resetToken={view ?? presentation}
          retryToken={visualRetryKey}
          fallback={visualUnavailableStatus}
        >
          <KnowledgeGraphVisualMount
            renderVisual={renderVisual}
            scene={scene}
            context={hostPolicy}
          />
        </KnowledgeGraphVisualBoundary>
      ) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus}
      <KnowledgeGraphCorpusLegendInternal
        presentation={presentation}
        view={view}
        themeMode={hostPolicy.themeMode}
      />
      <KnowledgeGraphCorpusA11yListInternal
        presentation={presentation}
        view={view}
        selectedId={selectedId}
        onSelect={onSelect}
        query={query}
        nodePageSize={nodePageSize}
      />
      <KnowledgeGraphCorpusStaticRecordViewInternal
        presentation={presentation}
        view={view}
        nodePageSize={recordNodePageSize}
        edgePageSize={recordEdgePageSize}
      />
    </figure>
  );
}
