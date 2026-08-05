import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ReadonlySemanticPalette } from '../core/colormaps';
import { safeDiagnosticText, safeErrorMessage } from '../core/safeRuntime';
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
  type KnowledgeGraphViewPolicyV1 as KnowledgeGraphViewPolicyDefinitionV1,
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';

export type KnowledgeGraphViewPolicyV1 = KnowledgeGraphViewPolicyDefinitionV1;

export type KnowledgeGraphCorpusFigureInputInternal =
  | {
      /** Materialized VizSpec; duplicate JSON members are no longer observable. */
      readonly spec: unknown;
      readonly specJson?: never;
    }
  | {
      /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
      readonly spec?: never;
      readonly specJson: string;
    };

export interface KnowledgeGraphSelectionControllerInternal {
  readonly value: string | null;
  readonly onChange: (id: string | null) => void;
}

export interface KnowledgeGraphCorpusFrameContextInternal {
  readonly presentation: PreparedCorpusKnowledgeGraphPresentationV1;
  readonly view: PreparedKnowledgeGraphViewV1 | undefined;
  readonly hostPolicy: KnowledgeGraphFigureHostPolicyV1;
  readonly activeToken:
    | PreparedCorpusKnowledgeGraphPresentationV1
    | PreparedKnowledgeGraphViewV1;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly hoverId: string | null;
  readonly onHover: ((id: string | null) => void) | undefined;
}

export type KnowledgeGraphCorpusPrimaryRegionInternal = (
  context: KnowledgeGraphCorpusFrameContextInternal,
) => ReactNode;

export interface KnowledgeGraphCorpusFrameInternalProps {
  /** Original wrapper props preserve own-property input-boundary semantics. */
  readonly sourceInput: KnowledgeGraphCorpusFigureInputInternal;
  /** Omit for the low-friction DOM entry, which owns selection internally. */
  readonly selectionController?: KnowledgeGraphSelectionControllerInternal;
  /** Present only for the interactive 3D wrapper. */
  readonly hoverController?: KnowledgeGraphSelectionControllerInternal;
  readonly renderPrimaryRegion?: KnowledgeGraphCorpusPrimaryRegionInternal;
  readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
  readonly query?: string;
  readonly nodePageSize?: number;
  readonly recordNodePageSize?: number;
  readonly recordEdgePageSize?: number;
  readonly activePalette?: ReadonlySemanticPalette;
  readonly className?: string;
  readonly label: string;
}

function inputBoundaryFailure(
  message: string,
): PrepareCorpusKnowledgeGraphFigureResultV1 {
  return Object.freeze({
    ok: false as const,
    errors: Object.freeze([
      Object.freeze({
        code: 'input_boundary_rejected' as const,
        path: 'spec/specJson',
        message,
      }),
    ]),
  });
}

function containsNode(
  presentation: PreparedKnowledgeGraphPresentationV1,
  view: PreparedKnowledgeGraphViewV1 | undefined,
  id: string,
): boolean {
  return view === undefined
    ? knowledgeGraphPresentationContainsNode(presentation, id)
    : knowledgeGraphViewContainsNode(view, presentation, id);
}

/**
 * Package-private, React-only corpus frame shared by the DOM and 3D wrappers.
 * It owns the strict input/caption/presentation chain and exposes no public
 * presentation or rendering slot. Its dependency closure must remain free of
 * Three, R3F, d3, ReactDOM, Node, browser, network, and filesystem modules.
 */
export function KnowledgeGraphCorpusFrameInternal({
  sourceInput,
  selectionController,
  hoverController,
  renderPrimaryRegion,
  viewPolicy,
  query = '',
  nodePageSize,
  recordNodePageSize,
  recordEdgePageSize,
  activePalette,
  className,
  label,
}: KnowledgeGraphCorpusFrameInternalProps) {
  const hasSpec = Object.hasOwn(sourceInput, 'spec');
  const hasSpecJson = Object.hasOwn(sourceInput, 'specJson');
  const spec = hasSpec
    ? (sourceInput as { readonly spec?: unknown }).spec
    : undefined;
  const specJson = hasSpecJson
    ? (sourceInput as { readonly specJson?: unknown }).specJson
    : undefined;
  const preparedSource = useMemo(() => {
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
  }, [activePalette, hasSpec, hasSpecJson, spec, specJson]);
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
  const hostPolicy = useMemo<KnowledgeGraphFigureHostPolicyV1 | undefined>(() => {
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
  }, [preparedSource, preparedView]);
  const activeToken = preparedSource.ok && preparedView.ok
    ? preparedView.view ?? preparedSource.presentation
    : undefined;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const internalSelectionToken = useRef<object | undefined>(undefined);
  const internallyControlled = selectionController === undefined;
  const internalTokenChanged = internallyControlled &&
    internalSelectionToken.current !== undefined &&
    internalSelectionToken.current !== activeToken;
  const selectedId = internallyControlled
    ? internalTokenChanged ? null : internalSelectedId
    : selectionController.value;
  const onSelect = internallyControlled
    ? setInternalSelectedId
    : selectionController.onChange;
  useEffect(() => {
    if (!internallyControlled) {
      internalSelectionToken.current = undefined;
      return;
    }
    if (activeToken === undefined) {
      internalSelectionToken.current = undefined;
      setInternalSelectedId(null);
      return;
    }
    if (internalSelectionToken.current !== activeToken) {
      internalSelectionToken.current = activeToken;
      setInternalSelectedId(null);
    }
  }, [activeToken, internallyControlled]);

  const effectiveSelectedId = preparedSource.ok && preparedView.ok &&
      selectedId !== null &&
      !containsNode(preparedSource.presentation, preparedView.view, selectedId)
    ? null
    : selectedId;
  const externalSelectionInvalid = !internallyControlled &&
    effectiveSelectedId !== selectedId;
  const selectionInvalidation = useRef<{
    readonly token: object;
    readonly id: string;
  } | null>(null);
  useEffect(() => {
    if (
      !externalSelectionInvalid ||
      activeToken === undefined ||
      selectedId === null
    ) {
      selectionInvalidation.current = null;
      return;
    }
    const previous = selectionInvalidation.current;
    if (previous?.token === activeToken && previous.id === selectedId) return;
    selectionInvalidation.current = { token: activeToken, id: selectedId };
    onSelect(null);
  }, [activeToken, externalSelectionInvalid, onSelect, selectedId]);

  const hoverId = hoverController?.value ?? null;
  const effectiveHoverId = preparedSource.ok && preparedView.ok &&
      hoverId !== null &&
      !containsNode(preparedSource.presentation, preparedView.view, hoverId)
    ? null
    : hoverId;
  const hoverInvalid = effectiveHoverId !== hoverId;
  const hoverInvalidation = useRef<{
    readonly token: object;
    readonly id: string;
  } | null>(null);
  useEffect(() => {
    if (
      !hoverInvalid ||
      activeToken === undefined ||
      hoverId === null ||
      hoverController === undefined
    ) {
      hoverInvalidation.current = null;
      return;
    }
    const previous = hoverInvalidation.current;
    if (previous?.token === activeToken && previous.id === hoverId) return;
    hoverInvalidation.current = { token: activeToken, id: hoverId };
    hoverController.onChange(null);
  }, [activeToken, hoverController, hoverId, hoverInvalid]);

  const captionId = `cortexel-kg-caption-${useId().replace(/:/gu, '')}`;
  if (!preparedSource.ok) {
    return (
      <section role="alert" aria-label="Invalid knowledge graph figure">
        <h3>Knowledge graph figure rejected</h3>
        <ul>
          {preparedSource.errors.map((error, index) => (
            <li key={index}>
              {safeDiagnosticText(`${error.path}: ${error.message}`, 840)}
            </li>
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
  if (hostPolicy === undefined || activeToken === undefined) {
    throw new Error('knowledge-graph frame invariant failed');
  }
  const { caption, presentation } = preparedSource;
  const { view } = preparedView;
  const primaryRegion = renderPrimaryRegion?.({
    presentation,
    view,
    hostPolicy,
    activeToken,
    selectedId: effectiveSelectedId,
    onSelect,
    hoverId: effectiveHoverId,
    onHover: hoverController?.onChange,
  });
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
          Filtered view: showing {view.counts.visibleNodes} of{' '}
          {view.counts.sourceNodes} nodes and {view.counts.visibleEdges} of{' '}
          {view.counts.sourceEdges} relationships. Relationships excluded by kind:{' '}
          {view.counts.edgeKindFilteredEdges}; excluded because an endpoint is hidden:{' '}
          {view.counts.endpointPrunedEdges}. The caption and record browser remain bound
          to the full source.
        </p>
      )}
      {primaryRegion}
      <KnowledgeGraphCorpusLegendInternal
        presentation={presentation}
        view={view}
        themeMode={hostPolicy.themeMode}
      />
      <KnowledgeGraphCorpusA11yListInternal
        presentation={presentation}
        view={view}
        selectedId={effectiveSelectedId}
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
