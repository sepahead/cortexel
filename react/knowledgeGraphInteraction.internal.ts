export interface MutableCurrent<T> {
  current: T;
}

export interface VisibilityTarget {
  visible: boolean;
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
