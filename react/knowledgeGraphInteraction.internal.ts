export interface MutableCurrent<T> {
  current: T;
}

export interface VisibilityTarget {
  visible: boolean;
}

export const KNOWLEDGE_GRAPH_CLICK_MAX_DELTA = 2;

export function isKnowledgeGraphInstanceId(
  instanceId: number | null | undefined,
  instanceCount: number,
): instanceId is number {
  return instanceId !== undefined && instanceId !== null &&
    Number.isSafeInteger(instanceId) &&
    instanceId >= 0 &&
    Number.isSafeInteger(instanceCount) &&
    instanceCount >= 0 &&
    instanceId < instanceCount;
}

/** R3F click events retain pointer travel; a controls drag is not selection. */
export function isIntentionalKnowledgeGraphClick(delta: number): boolean {
  return Number.isFinite(delta) && delta >= 0 &&
    delta <= KNOWLEDGE_GRAPH_CLICK_MAX_DELTA;
}

/**
 * Consume every ready, in-range node hit before interpreting pointer travel.
 * A controls drag that ends over a node is not a selection, but it must not
 * bubble into a host/background click handler and become a different action.
 */
export function handleKnowledgeGraphNodeClick(
  ready: boolean,
  instanceId: number | undefined,
  instanceCount: number,
  delta: number,
  stopPropagation: () => void,
  activate: (instanceId: number) => void,
): void {
  if (
    !ready ||
    !isKnowledgeGraphInstanceId(instanceId, instanceCount)
  ) return;
  stopPropagation();
  if (isIntentionalKnowledgeGraphClick(delta)) activate(instanceId);
}

/** One selection rule shared by the mesh and its operable DOM companion. */
export function toggledKnowledgeGraphSelection(
  selectedId: string | null,
  activatedId: string,
): string | null {
  return selectedId === activatedId ? null : activatedId;
}

export interface StartEventSurface {
  addEventListener?(type: 'start', listener: () => void): void;
  removeEventListener?(type: 'start', listener: () => void): void;
}

function hasCompleteStartEventSurface(
  value: StartEventSurface | null,
): value is Required<StartEventSurface> {
  return value !== null &&
    typeof value.addEventListener === 'function' &&
    typeof value.removeEventListener === 'function';
}

/** Attach only to a complete add/remove pair, so every accepted registration has
 * an exact swap/unmount cleanup path. The authority records only attached hosts. */
export function synchronizeKnowledgeGraphControlsListener<T extends StartEventSurface>(
  authority: MutableCurrent<T | null>,
  candidate: T | null,
  listener: () => void,
): void {
  const previous = authority.current;
  const attachableCandidate = hasCompleteStartEventSurface(candidate) ? candidate : null;
  if (previous === attachableCandidate) return;
  if (hasCompleteStartEventSurface(previous)) {
    // Preserve cleanup authority if the host throws before confirming removal.
    previous.removeEventListener('start', listener);
  }
  authority.current = null;
  if (attachableCandidate) {
    try {
      attachableCandidate.addEventListener('start', listener);
    } catch (addError) {
      // An EventDispatcher may register and then throw. The accepted complete
      // surface gives us an exact rollback attempt before propagating failure.
      // Retain that cleanup authority until rollback is confirmed.
      authority.current = attachableCandidate;
      try {
        attachableCandidate.removeEventListener('start', listener);
      } catch (rollbackError) {
        throw new AggregateError(
          [addError, rollbackError],
          'controls-listener attachment and rollback both failed',
        );
      }
      authority.current = null;
      throw addError;
    }
    authority.current = attachableCandidate;
  }
}

/**
 * Enter a new graph-runtime transaction before invoking any host callback.
 * A throwing host hover handler cannot leave prior geometry marked visible or
 * interactive under current props.
 */
export function beginKnowledgeGraphRuntimeTransition(
  readyGraphKey: MutableCurrent<string | null>,
  geometryDirty: MutableCurrent<boolean>,
  group: VisibilityTarget | null,
  invalidate: () => void,
  clearHover: () => void,
): void {
  readyGraphKey.current = null;
  geometryDirty.current = true;
  if (group) group.visible = false;
  let invalidateFailed = false;
  let invalidateError: unknown;
  try {
    invalidate();
  } catch (error) {
    invalidateFailed = true;
    invalidateError = error;
  }
  let hoverFailed = false;
  let hoverError: unknown;
  try {
    clearHover();
  } catch (error) {
    hoverFailed = true;
    hoverError = error;
  }
  if (invalidateFailed && hoverFailed) {
    throw new AggregateError(
      [invalidateError, hoverError],
      'graph invalidation and hover cleanup both failed',
    );
  }
  if (invalidateFailed) throw invalidateError;
  if (hoverFailed) throw hoverError;
}

/** Invisible/unready meshes must not swallow another object's event, but a real
 * pointer-out must still clear graph-owned hover instead of becoming stuck. */
export function handleKnowledgeGraphPointerOut(
  ready: boolean,
  stopPropagation: () => void,
  clearHover: () => void,
): void {
  if (ready) stopPropagation();
  clearHover();
}
