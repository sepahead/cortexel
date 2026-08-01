import {
  CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  GRAPH_LAYOUT_TICK_SECONDS,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphIdentity,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  assignGraphEdgeLanes,
  buildAdjacency,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphCameraTargetDamping,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto,
  graphQueryMatchIds,
  graphSignature,
  isKnowledgeGraphLiveForceWithinBudget,
  knowledgeGraphLiveForceAvailability,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks
} from "../chunk-22DS5UXH.js";
import {
  KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
  KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
  KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE,
  graphEdgeIdentityKey,
  knowledgeGraphAutoFrameNodeRadialExtent,
  knowledgeGraphContrastSafeColor,
  knowledgeGraphEdgeStrokeDescription,
  knowledgeGraphEdgeStrokeSegmentVisible,
  knowledgeGraphNodeEmphasisDimAmount,
  knowledgeGraphNodeGlyphDescription,
  knowledgeGraphRenderedNodeRadialExtent,
  knowledgeGraphRenderedNodeScale
} from "../chunk-VINPKPR3.js";
import "../chunk-FFYJVPAY.js";
import {
  KNOWLEDGE_GRAPH_LIMITS,
  SAFE_DISPLAY_STRING_PATTERN,
  safeDiagnosticText,
  safeErrorMessage
} from "../chunk-VSZKJBXV.js";
import "../chunk-EVZW37W7.js";
import "../chunk-RF2EM75L.js";
import "../chunk-ZYBCCIMH.js";

// react/KnowledgeGraph3DScene.tsx
import {
  useCallback,
  useEffect as useEffect4,
  useLayoutEffect,
  useMemo as useMemo4,
  useRef as useRef3,
  useState as useState3
} from "react";
import {
  useFrame,
  useThree
} from "@react-three/fiber";
import * as THREE2 from "three";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide
} from "d3-force-3d";

// react/knowledgeGraphLayout.internal.ts
function snapshotGraphLayoutInputs(nodes, edges) {
  const nodeSnapshot = nodes.map(({ id, radius, nodeGlyph }) => ({
    id,
    radius,
    nodeGlyph
  }));
  const edgeSnapshot = edges.map(({
    id,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern
  }) => ({
    id,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern
  }));
  return {
    graphKey: graphSignature(nodeSnapshot, edgeSnapshot),
    nodes: nodeSnapshot,
    edges: edgeSnapshot
  };
}
function planGraphLayoutCache(nodes, remembered, maxRememberedPositions) {
  if (!Number.isSafeInteger(maxRememberedPositions) || maxRememberedPositions < nodes.length) {
    throw new RangeError(
      "max remembered graph positions must be an integer at least as large as the active graph"
    );
  }
  const activeIds = /* @__PURE__ */ new Set();
  const plannedNodes = new Array(nodes.length);
  let warmStart = false;
  for (let index = 0; index < nodes.length; index++) {
    const input = nodes[index];
    if (activeIds.has(input.id)) {
      throw new RangeError("graph layout node ids must be unique");
    }
    activeIds.add(input.id);
    const r = normalizeGraphNodeRadius(input.radius);
    const previous = remembered.get(input.id);
    if (previous === void 0) {
      plannedNodes[index] = { id: input.id, r };
      continue;
    }
    warmStart = true;
    plannedNodes[index] = {
      id: input.id,
      r,
      x: previous[0],
      y: previous[1],
      z: previous[2]
    };
  }
  const makeBuffer = () => {
    const cache = /* @__PURE__ */ new Map();
    for (const [id, previous] of remembered) {
      cache.set(id, [previous[0], previous[1], previous[2]]);
    }
    const positionSlots = new Array(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
      const id = nodes[index].id;
      const previous = cache.get(id);
      const slot = previous ?? [0, 0, 0];
      if (previous !== void 0) cache.delete(id);
      cache.set(id, slot);
      positionSlots[index] = slot;
    }
    if (cache.size > maxRememberedPositions) {
      for (const id of cache.keys()) {
        if (cache.size <= maxRememberedPositions) break;
        if (!activeIds.has(id)) cache.delete(id);
      }
    }
    if (cache.size > maxRememberedPositions) {
      throw new Error("active graph positions exceeded the validated cache authority");
    }
    return { cache, positionSlots };
  };
  return {
    nodes: plannedNodes,
    cacheBuffers: [makeBuffer(), makeBuffer()],
    warmStart
  };
}
function publishGraphLayoutCache(authority, buffered, completedBufferIndex) {
  if (completedBufferIndex !== buffered.nextCacheBufferIndex) {
    throw new Error("graph layout cache publication is out of sequence");
  }
  buffered.nextCacheBufferIndex = completedBufferIndex === 0 ? 1 : 0;
  authority.current = buffered.cacheBuffers[completedBufferIndex].cache;
}

// react/focusLabelResource.internal.ts
import * as THREE from "three";
var FOCUS_LABEL_MAX_WORLD_WIDTH = 160;
var FOCUS_LABEL_WORLD_HEIGHT = 7;
var FOCUS_LABEL_NODE_GAP = 4;
function knowledgeGraphFocusLabelSpriteCenterY(nodeRadius, nodeGlyph) {
  return -(knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) + FOCUS_LABEL_NODE_GAP) / FOCUS_LABEL_WORLD_HEIGHT;
}
var FOCUS_LABEL_THEME = Object.freeze({
  dark: Object.freeze({
    background: "#030711",
    text: "#e2e8f0"
  }),
  light: Object.freeze({
    background: "#f8fafc",
    text: "#0f172a"
  })
});
function installFocusLabelResource({
  sprite,
  material,
  label,
  color,
  themeMode,
  invalidate,
  createCanvas = () => typeof document === "undefined" ? null : document.createElement("canvas"),
  createTexture = (canvas) => new THREE.CanvasTexture(canvas)
}) {
  sprite.visible = false;
  material.map = null;
  material.needsUpdate = true;
  if (!label) {
    invalidate();
    return void 0;
  }
  const canvas = createCanvas();
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    invalidate();
    return void 0;
  }
  const fontSize = 42;
  const paddingX = 24;
  const paddingY = 14;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  const measured = Math.ceil(context.measureText(label).width);
  canvas.width = Math.min(1024, Math.max(96, measured + paddingX * 2));
  canvas.height = fontSize + paddingY * 2;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const theme = FOCUS_LABEL_THEME[themeMode];
  context.fillStyle = theme.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = theme.text;
  context.fillStyle = color;
  context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - paddingX * 2);
  const texture = createTexture(canvas);
  try {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    material.map = texture;
    material.needsUpdate = true;
    sprite.scale.set(
      Math.min(
        FOCUS_LABEL_MAX_WORLD_WIDTH,
        canvas.width / canvas.height * FOCUS_LABEL_WORLD_HEIGHT
      ),
      FOCUS_LABEL_WORLD_HEIGHT,
      1
    );
    sprite.visible = true;
    invalidate();
  } catch (setupError) {
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
    }
    try {
      texture.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [setupError, disposeError],
        "focus-label setup and rollback both failed"
      );
    }
    throw setupError;
  }
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    let shouldInvalidate = false;
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
      shouldInvalidate = true;
    }
    let disposeFailed = false;
    let disposeError;
    try {
      texture.dispose();
    } catch (error) {
      disposeFailed = true;
      disposeError = error;
    }
    let invalidateFailed = false;
    let invalidateError;
    if (shouldInvalidate) {
      try {
        invalidate();
      } catch (error) {
        invalidateFailed = true;
        invalidateError = error;
      }
    }
    if (disposeFailed && invalidateFailed) {
      throw new AggregateError(
        [disposeError, invalidateError],
        "focus-label disposal and invalidation both failed"
      );
    }
    if (disposeFailed) throw disposeError;
    if (invalidateFailed) throw invalidateError;
  };
}

// react/KnowledgeGraph3DScene.tsx
import {
  assertPreparedCorpusKnowledgeGraphPresentation as assertPreparedCorpusKnowledgeGraphPresentation3,
  assertPreparedGenericKnowledgeGraphPresentation as assertPreparedGenericKnowledgeGraphPresentation3,
  assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView3,
  assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation3,
  knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode3
} from "#cortexel-knowledge-graph-presentation-capability";

// react/knowledgeGraphPresentationProps.internal.ts
function hasWellFormedUtf16(value) {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 55296 && unit <= 56319) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 56320 || next > 57343) return false;
      index += 1;
    } else if (unit >= 56320 && unit <= 57343) {
      return false;
    }
  }
  return true;
}
function assertKnowledgeGraphNodeReference(value, label) {
  if (value === null) return;
  if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength} characters or null`
    );
  }
}
function assertKnowledgeGraphColor(value, label) {
  if (value === void 0) return;
  if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxColorLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxColorLength} characters`
    );
  }
}

// react/knowledgeGraphInteraction.internal.ts
var KNOWLEDGE_GRAPH_CLICK_MAX_DELTA = 2;
function isKnowledgeGraphInstanceId(instanceId, instanceCount) {
  return instanceId !== void 0 && instanceId !== null && Number.isSafeInteger(instanceId) && instanceId >= 0 && Number.isSafeInteger(instanceCount) && instanceCount >= 0 && instanceId < instanceCount;
}
function isIntentionalKnowledgeGraphClick(delta) {
  return Number.isFinite(delta) && delta >= 0 && delta <= KNOWLEDGE_GRAPH_CLICK_MAX_DELTA;
}
function handleKnowledgeGraphNodeClick(ready, instanceId, instanceCount, delta, stopPropagation, activate) {
  if (!ready || !isKnowledgeGraphInstanceId(instanceId, instanceCount)) return;
  stopPropagation();
  if (isIntentionalKnowledgeGraphClick(delta)) activate(instanceId);
}
function toggledKnowledgeGraphSelection(selectedId, activatedId) {
  return selectedId === activatedId ? null : activatedId;
}
function hasCompleteStartEventSurface(value) {
  return value !== null && typeof value.addEventListener === "function" && typeof value.removeEventListener === "function";
}
function synchronizeKnowledgeGraphControlsListener(authority, candidate, listener) {
  const previous = authority.current;
  const attachableCandidate = hasCompleteStartEventSurface(candidate) ? candidate : null;
  if (previous === attachableCandidate) return;
  if (hasCompleteStartEventSurface(previous)) {
    previous.removeEventListener("start", listener);
  }
  authority.current = null;
  if (attachableCandidate) {
    try {
      attachableCandidate.addEventListener("start", listener);
    } catch (addError) {
      authority.current = attachableCandidate;
      try {
        attachableCandidate.removeEventListener("start", listener);
      } catch (rollbackError) {
        throw new AggregateError(
          [addError, rollbackError],
          "controls-listener attachment and rollback both failed"
        );
      }
      authority.current = null;
      throw addError;
    }
    authority.current = attachableCandidate;
  }
}
function beginKnowledgeGraphRuntimeTransition(readyGraphKey, geometryDirty, group, invalidate, clearHover) {
  readyGraphKey.current = null;
  geometryDirty.current = true;
  if (group) group.visible = false;
  let invalidateFailed = false;
  let invalidateError;
  try {
    invalidate();
  } catch (error) {
    invalidateFailed = true;
    invalidateError = error;
  }
  let hoverFailed = false;
  let hoverError;
  try {
    clearHover();
  } catch (error) {
    hoverFailed = true;
    hoverError = error;
  }
  if (invalidateFailed && hoverFailed) {
    throw new AggregateError(
      [invalidateError, hoverError],
      "graph invalidation and hover cleanup both failed"
    );
  }
  if (invalidateFailed) throw invalidateError;
  if (hoverFailed) throw hoverError;
}
function handleKnowledgeGraphPointerOut(ready, stopPropagation, clearHover) {
  if (ready) stopPropagation();
  clearHover();
}

// react/knowledgeGraphCamera.internal.ts
var KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN = 1.12;
var KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE = 120;
var KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN = 1.25;
var KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR = 1e-3;
var IDENTITY_MATRIX_ELEMENTS = Object.freeze([
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
]);
function finiteEqual(observed, expected) {
  if (!Number.isFinite(observed) || !Number.isFinite(expected)) return false;
  const scale = Math.max(1, Math.abs(observed), Math.abs(expected));
  return Math.abs(observed - expected) <= Number.EPSILON * 64 * scale;
}
function isKnowledgeGraphIdentityMatrixElements(elements) {
  if (elements.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(elements[index], IDENTITY_MATRIX_ELEMENTS[index])) return false;
  }
  return true;
}
function areKnowledgeGraphMatrixElementsEqual(first, second) {
  if (first.length !== 16 || second.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(first[index], second[index])) return false;
  }
  return true;
}
function isKnowledgeGraphCameraSelfTransformCanonical(input) {
  const { position, quaternion, scale } = input;
  if (!input.matrixAutoUpdate || !isKnowledgeGraphCameraVectorFinite(position.x, position.y, position.z) || !isKnowledgeGraphCameraVectorFinite(scale.x, scale.y, scale.z) || scale.x !== 1 || scale.y !== 1 || scale.z !== 1 || !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) || !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w) || input.matrix.elements.length !== 16 || input.matrixWorld.elements.length !== 16) return false;
  const norm = quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
  if (!finiteEqual(norm, 1)) return false;
  const x2 = quaternion.x + quaternion.x;
  const y2 = quaternion.y + quaternion.y;
  const z2 = quaternion.z + quaternion.z;
  const xx = quaternion.x * x2;
  const xy = quaternion.x * y2;
  const xz = quaternion.x * z2;
  const yy = quaternion.y * y2;
  const yz = quaternion.y * z2;
  const zz = quaternion.z * z2;
  const wx = quaternion.w * x2;
  const wy = quaternion.w * y2;
  const wz = quaternion.w * z2;
  const matrix = input.matrix.elements;
  if (!(finiteEqual(matrix[0], 1 - (yy + zz)) && finiteEqual(matrix[1], xy + wz) && finiteEqual(matrix[2], xz - wy) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], xy - wz) && finiteEqual(matrix[5], 1 - (xx + zz)) && finiteEqual(matrix[6], yz + wx) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], xz + wy) && finiteEqual(matrix[9], yz - wx) && finiteEqual(matrix[10], 1 - (xx + yy)) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], position.x) && finiteEqual(matrix[13], position.y) && finiteEqual(matrix[14], position.z) && finiteEqual(matrix[15], 1))) return false;
  return areKnowledgeGraphMatrixElementsEqual(matrix, input.matrixWorld.elements);
}
function isKnowledgeGraphCameraParentChainIdentity(parent) {
  let cursor = parent;
  let depth = 0;
  while (cursor !== null) {
    depth++;
    if (depth > 64) return false;
    if (cursor.position.x !== 0 || cursor.position.y !== 0 || cursor.position.z !== 0 || cursor.quaternion.x !== 0 || cursor.quaternion.y !== 0 || cursor.quaternion.z !== 0 || cursor.quaternion.w !== 1 || cursor.scale.x !== 1 || cursor.scale.y !== 1 || cursor.scale.z !== 1 || !isKnowledgeGraphIdentityMatrixElements(cursor.matrix.elements) || !isKnowledgeGraphIdentityMatrixElements(cursor.matrixWorld.elements)) return false;
    cursor = cursor.parent;
  }
  return true;
}
function canonicalPerspectiveProjection(input) {
  if (!Number.isFinite(input.fovDegrees) || input.fovDegrees <= 0 || input.fovDegrees >= 180 || !Number.isFinite(input.aspect) || input.aspect <= 0 || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near <= 0 || !Number.isFinite(input.far) || input.far <= input.near || !Number.isFinite(input.filmOffset) || input.filmOffset !== 0 || input.projectionMatrixElements.length !== 16) return false;
  const halfFov = input.fovDegrees * Math.PI / 360;
  const y = input.zoom / Math.tan(halfFov);
  const x = y / input.aspect;
  const c = -(input.far + input.near) / (input.far - input.near);
  const d = -2 * input.far * input.near / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], -1) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 0);
}
function canonicalOrthographicProjection(input) {
  if (!Number.isFinite(input.left) || !Number.isFinite(input.right) || !Number.isFinite(input.top) || !Number.isFinite(input.bottom) || input.right <= input.left || input.top <= input.bottom || !finiteEqual(input.left, -input.right) || !finiteEqual(input.bottom, -input.top) || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near < 0 || !Number.isFinite(input.far) || input.far <= input.near || input.projectionMatrixElements.length !== 16) return false;
  const x = 2 * input.zoom / (input.right - input.left);
  const y = 2 * input.zoom / (input.top - input.bottom);
  const c = -2 / (input.far - input.near);
  const d = -(input.far + input.near) / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 1);
}
function isKnowledgeGraphCenteredAutoFrameProjectionSupported(input) {
  if (input.isArrayCamera || input.viewEnabled || !input.parentTransformIdentity || !input.selfTransformCanonical || !input.cameraMethodsCanonical || !input.projectionMethodCanonical || !input.webGlCoordinateSystem) return false;
  if (input.kind === "perspective") {
    return input.effectiveFovMethodCanonical && canonicalPerspectiveProjection(input);
  }
  return canonicalOrthographicProjection(input);
}
function isKnowledgeGraphPerspectiveProjectionReady(effectiveFovDegrees, aspect) {
  return Number.isFinite(effectiveFovDegrees) && effectiveFovDegrees > 0 && effectiveFovDegrees < 180 && Number.isFinite(aspect) && aspect > 0;
}
function isKnowledgeGraphOrthographicProjectionReady(horizontalSpan, verticalSpan, zoom) {
  return Number.isFinite(horizontalSpan) && horizontalSpan > 0 && Number.isFinite(verticalSpan) && verticalSpan > 0 && Number.isFinite(zoom) && zoom > 0;
}
function isKnowledgeGraphCameraVectorFinite(x, y, z) {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}
function knowledgeGraphCameraProjectionKind(camera) {
  const perspective = camera.isPerspectiveCamera === true;
  const orthographic = camera.isOrthographicCamera === true;
  if (perspective === orthographic) return null;
  if (perspective) return "perspective";
  if (orthographic) return "orthographic";
  return null;
}
function planKnowledgeGraphCameraClippingInto(kind, currentNearValue, currentFarValue, distanceValue, contentRadiusValue, target) {
  const radius = positiveFinite(contentRadiusValue, 1);
  const distance = positiveFinite(
    distanceValue,
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE
  );
  const minimumNear = kind === "perspective" ? KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR : 0;
  const maximumNear = Math.max(
    minimumNear,
    distance - radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN
  );
  const fallbackNear = kind === "perspective" ? Math.min(0.1, maximumNear) : 0;
  const currentNear = Number.isFinite(currentNearValue) && currentNearValue >= minimumNear ? currentNearValue : fallbackNear;
  const near = Math.min(currentNear, maximumNear);
  const requiredFar = Math.max(
    near + KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR,
    distance + radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN
  );
  const currentFar = Number.isFinite(currentFarValue) && currentFarValue > near ? currentFarValue : requiredFar;
  target.near = near;
  target.far = Math.max(currentFar, requiredFar);
  return target;
}
function positiveFinite(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function planKnowledgeGraphPerspectiveCameraFitInto(contentRadius, currentCameraDistance, verticalFovDegrees, aspectRatio, target) {
  const radius = positiveFinite(contentRadius, 1);
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const verticalFov = positiveFinite(verticalFovDegrees, 50);
  const aspect = positiveFinite(aspectRatio, 1);
  const verticalHalf = Math.min(89.5, Math.max(0.5, verticalFov / 2)) * Math.PI / 180;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
  const limitingHalf = Math.max(1e-6, Math.min(
    verticalHalf,
    horizontalHalf
  ));
  const fitDistance = paddedRadius / Math.sin(limitingHalf);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    fitDistance
  );
  target.orthographicZoom = void 0;
  return target;
}
function planKnowledgeGraphOrthographicCameraFitInto(contentRadius, currentCameraDistance, horizontalSpan, verticalSpan, currentCameraZoom, target) {
  const radius = positiveFinite(contentRadius, 1);
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const horizontalHalf = positiveFinite(horizontalSpan, 2) / 2;
  const verticalHalf = positiveFinite(verticalSpan, 2) / 2;
  const fitZoom = Math.min(horizontalHalf, verticalHalf) / paddedRadius;
  const currentZoom = positiveFinite(currentCameraZoom, 1);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    paddedRadius * 2
  );
  target.orthographicZoom = positiveFinite(fitZoom, currentZoom);
  return target;
}

// react/knowledgeGraphParticles.internal.ts
var KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND = 0.28;
var MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS = 0.1;
function advanceKnowledgeGraphFlowPhase(currentPhase, deltaSeconds) {
  const normalized = Number.isFinite(currentPhase) ? (currentPhase % 1 + 1) % 1 : 0;
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS) : 0;
  return (normalized + delta * KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND) % 1;
}
function reducedMotionFlowParticleFraction(particleIndex, particlesOnEdge) {
  if (!Number.isSafeInteger(particlesOnEdge) || particlesOnEdge < 1 || !Number.isSafeInteger(particleIndex) || particleIndex < 0 || particleIndex >= particlesOnEdge) {
    throw new RangeError(
      "reduced-motion particle index must belong to a positive finite allocation"
    );
  }
  return (particleIndex + 1) / (particlesOnEdge + 1);
}
function planFlowParticleDistribution(flowEdgeCount, requestedPerEdge, maxParticles) {
  const edges = Number.isFinite(flowEdgeCount) ? Math.max(0, Math.floor(flowEdgeCount)) : 0;
  const total = flowParticleCount(edges, requestedPerEdge, maxParticles);
  if (edges === 0) return { total: 0, basePerEdge: 0, extraEdgeCount: 0 };
  if (total < edges) {
    throw new RangeError("flow-particle cap must retain at least one marker per edge");
  }
  const basePerEdge = Math.floor(total / edges);
  return {
    total,
    basePerEdge,
    extraEdgeCount: total - basePerEdge * edges
  };
}

// react/KnowledgeGraphA11yList.tsx
import { useEffect, useId, useMemo, useRef, useState } from "react";

// react/knowledgeGraphA11yNavigation.internal.ts
function planKnowledgeGraphA11yNavigation(queryActive, queryMatchIndexes, selectedIndex, pageSize, pageCount) {
  const boundedPageCount = Math.max(1, pageCount);
  if (queryActive && queryMatchIndexes.length > 0) {
    const selectedCursor = selectedIndex < 0 ? -1 : queryMatchIndexes.indexOf(selectedIndex);
    const matchCursor = selectedCursor < 0 ? 0 : selectedCursor;
    const rowIndex = queryMatchIndexes[matchCursor] ?? 0;
    return Object.freeze({
      matchCursor,
      nodePage: Math.min(
        boundedPageCount - 1,
        Math.max(0, Math.floor(rowIndex / pageSize))
      )
    });
  }
  return Object.freeze({
    matchCursor: 0,
    nodePage: selectedIndex < 0 ? 0 : Math.min(
      boundedPageCount - 1,
      Math.max(0, Math.floor(selectedIndex / pageSize))
    )
  });
}
function knowledgeGraphA11yNavigationContextKey(normalizedQuery, pageSize, selectedId, orderedNodeIds, orderedMatchIds) {
  return JSON.stringify([
    normalizedQuery,
    pageSize,
    selectedId,
    orderedNodeIds,
    orderedMatchIds
  ]);
}

// react/KnowledgeGraphA11yList.tsx
import {
  assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  assertPreparedKnowledgeGraphPresentation,
  knowledgeGraphViewContainsNode
} from "#cortexel-knowledge-graph-presentation-capability";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var INLINE_RELATION_LIMIT = 8;
var RELATION_PAGE_SIZE = 8;
var INLINE_ATTRIBUTE_LIMIT = 3;
var INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
var INLINE_EVIDENCE_LIMIT = 2;
var DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
var MAX_A11Y_NODE_PAGE_SIZE = 100;
var CALLER_DEFINED_RADIUS_MEANING = "visual size has no declared quantitative interpretation";
function radiusMeaningText(value, corpusVisualMapping) {
  const meaning = safeDiagnosticText(
    value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING,
    400
  );
  return corpusVisualMapping ? meaning : `Caller-declared: ${meaning}`;
}
function attributeValueText(value) {
  if (Array.isArray(value)) {
    const shown = value.slice(0, INLINE_ATTRIBUTE_ARRAY_LIMIT).map((item) => safeDiagnosticText(String(item), 80));
    const omitted = value.length - shown.length;
    return `[${shown.join(", ")}${omitted > 0 ? `, ${omitted} more` : ""}]`;
  }
  return safeDiagnosticText(String(value), 120);
}
function evidenceRefText(item) {
  const prefix = `${safeDiagnosticText(item.kind, 80)} ` + safeDiagnosticText(item.evidence_id, 384);
  switch (item.kind) {
    case "graph_snapshot_record":
      return `${prefix}; record ${safeDiagnosticText(item.record_id, 320)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "graph_node":
      return `${prefix}; node ${safeDiagnosticText(item.node_id, 120)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "citation":
      return `${prefix}; paper ${safeDiagnosticText(item.paper_id, 160)}; citation ${safeDiagnosticText(item.citation_id, 160)}` + (item.page === void 0 ? "" : `; page ${item.page}`) + (item.doi ? `; DOI ${safeDiagnosticText(item.doi, 240)}` : "") + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "external_source":
      return `${prefix}; source ${safeDiagnosticText(item.source_id, 240)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
  }
}
function fullEvidenceRefText(item) {
  const summary = evidenceRefText(item);
  return "excerpt" in item && item.excerpt ? `${summary}; excerpt ${safeDiagnosticText(item.excerpt, 1e3)}` : summary;
}
function fullAttributeValueText(value) {
  return Array.isArray(value) ? value.map((item) => safeDiagnosticText(String(item), 500)).join(", ") : safeDiagnosticText(String(value), 500);
}
function hasMetadata(value) {
  return value.radius !== void 0 || value.detail !== void 0 || value.attributes !== void 0 && Object.keys(value.attributes).length > 0 || value.epistemic !== void 0 || value.evidence !== void 0 && value.evidence.length > 0 || value.uncalibrated_score !== void 0;
}
function FullMetadata({
  value,
  label,
  corpusVisualMapping
}) {
  return /* @__PURE__ */ jsxs("div", { "aria-label": safeDiagnosticText(label, 400), children: [
    value.radius !== void 0 && /* @__PURE__ */ jsxs("p", { children: [
      "Visual radius: ",
      normalizeGraphNodeRadius(value.radius),
      ". Radius meaning:",
      " ",
      radiusMeaningText(value, corpusVisualMapping)
    ] }),
    value.detail && /* @__PURE__ */ jsxs("p", { children: [
      "Detail: ",
      safeDiagnosticText(value.detail, 1e3)
    ] }),
    value.attributes && Object.keys(value.attributes).length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "All attributes" }),
      /* @__PURE__ */ jsx("dl", { children: Object.entries(value.attributes).map(([key, item]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: safeDiagnosticText(key, 80) }),
        /* @__PURE__ */ jsx("dd", { children: fullAttributeValueText(item) })
      ] }, key)) })
    ] }),
    value.epistemic && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Full epistemic status" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Status" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.epistemic.status, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Advisory only" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.advisory_only) }),
        /* @__PURE__ */ jsx("dt", { children: "Paper-local evidence" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
        /* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.calibrated_posterior) })
      ] })
    ] }),
    value.evidence && value.evidence.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "All evidence references (",
        value.evidence.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("ol", { children: value.evidence.map((item) => /* @__PURE__ */ jsx("li", { children: fullEvidenceRefText(item) }, item.evidence_id)) })
    ] }),
    value.uncalibrated_score && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Full uncalibrated score" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Kind" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.uncalibrated_score.kind, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Value" }),
        /* @__PURE__ */ jsx("dd", { children: value.uncalibrated_score.value }),
        /* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
      ] })
    ] })
  ] });
}
function MetadataDisclosure({
  value,
  label,
  corpusVisualMapping = false
}) {
  const [expanded, setExpanded] = useState(false);
  if (!hasMetadata(value)) return null;
  return /* @__PURE__ */ jsxs("details", { onToggle: (event) => setExpanded(event.currentTarget.open), children: [
    /* @__PURE__ */ jsxs("summary", { style: { minHeight: 44 }, children: [
      "Browse full metadata for ",
      safeDiagnosticText(label, 400)
    ] }),
    expanded && /* @__PURE__ */ jsx(
      FullMetadata,
      {
        value,
        label: `Full metadata for ${label}`,
        corpusVisualMapping
      }
    )
  ] });
}
function metadataSummary(value, corpusVisualMapping = false) {
  const parts = [];
  if (value.radius !== void 0) {
    parts.push(
      `Visual radius: ${normalizeGraphNodeRadius(value.radius)}; radius meaning: ${radiusMeaningText(value, corpusVisualMapping)}`
    );
  }
  if (value.detail) parts.push(`Detail: ${safeDiagnosticText(value.detail, 300)}`);
  if (value.attributes) {
    const entries = Object.entries(value.attributes);
    const shown = entries.slice(0, INLINE_ATTRIBUTE_LIMIT).map(([key, item]) => `${safeDiagnosticText(key, 80)}=${attributeValueText(item)}`);
    if (shown.length > 0) {
      const omitted = entries.length - shown.length;
      parts.push(`Attributes: ${shown.join(", ")}${omitted > 0 ? `; ${omitted} more` : ""}`);
    }
  }
  if (value.epistemic) {
    parts.push(
      `Epistemic: ${safeDiagnosticText(value.epistemic.status, 80)}; advisory only; not paper-local evidence; uncalibrated`
    );
  }
  if (value.evidence) {
    const shown = value.evidence.slice(0, INLINE_EVIDENCE_LIMIT).map(evidenceRefText);
    const omitted = value.evidence.length - shown.length;
    parts.push(
      `Evidence (${value.evidence.length}): ${shown.join(", ")}` + (omitted > 0 ? `; ${omitted} more` : "")
    );
  }
  if (value.uncalibrated_score) {
    parts.push(
      `Uncalibrated score: ${safeDiagnosticText(value.uncalibrated_score.kind, 80)} ${value.uncalibrated_score.value}`
    );
  }
  return parts.join(". ");
}
function relationshipText(nodeId, edge, byId) {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const other = source.id === nodeId ? target : source;
  const direction = edge.directed === false ? "connected to" : source.id === nodeId ? "points to" : "from";
  const assertion = edge.id === void 0 ? "" : ` [${safeDiagnosticText(edge.id, 320)}]`;
  const kind = safeDiagnosticText(edge.kind, 80);
  const label = edge.label && edge.label !== edge.kind ? `${safeDiagnosticText(edge.label, 160)} (${kind})` : kind;
  const metadata = metadataSummary(edge);
  return `${label}${assertion}: ${direction} ${safeDiagnosticText(other.label, 240)} (node id ${safeDiagnosticText(other.id, 120)})` + (metadata ? `. ${metadata}` : "");
}
function KnowledgeGraphA11yList(props) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}
function KnowledgeGraphCorpusA11yListInternal(props) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}
function renderKnowledgeGraphA11yList(props) {
  const { presentation, view, ...interactionProps } = props;
  assertPreparedKnowledgeGraphPresentation(presentation);
  if (view !== void 0) assertPreparedKnowledgeGraphView(view, presentation);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  const selectedId = view !== void 0 && props.selectedId !== null && !knowledgeGraphViewContainsNode(view, presentation, props.selectedId) ? null : props.selectedId;
  return /* @__PURE__ */ jsx(
    KnowledgeGraphA11yListInstance,
    {
      ...interactionProps,
      selectedId,
      nodes: view?.nodes ?? presentation.nodes,
      edges: view?.edges ?? presentation.edges,
      corpusVisualMapping: presentation.profile === "corpus_entity",
      view
    },
    presentation.graphIdentity
  );
}
function KnowledgeGraphA11yListInstance({
  nodes,
  edges,
  corpusVisualMapping,
  selectedId,
  onSelect,
  query = "",
  className,
  label = "Knowledge graph nodes",
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE,
  view
}) {
  const instanceId = useId().replace(/:/g, "");
  const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize)) : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const { byId, validEdges, relations } = useMemo(() => {
    const byId2 = new Map(nodes.map((node) => [node.id, node]));
    const validEdges2 = filterGraphEdges(new Set(byId2.keys()), edges);
    const relations2 = /* @__PURE__ */ new Map();
    for (const node of nodes) relations2.set(node.id, []);
    for (let index = 0; index < validEdges2.length; index++) {
      const edge = validEdges2[index];
      const source = byId2.get(edge.source);
      const target = byId2.get(edge.target);
      if (!source || !target || source.id === target.id) continue;
      relations2.get(source.id)?.push(index);
      relations2.get(target.id)?.push(index);
    }
    return { byId: byId2, validEdges: validEdges2, relations: relations2 };
  }, [nodes, edges]);
  const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
  const matchingNodeIds = useMemo(
    () => graphQueryMatchIds(nodes, normalizedQuery, validEdges),
    [nodes, normalizedQuery, validEdges]
  );
  const rows = useMemo(() => nodes.map((node) => ({
    node,
    relationIndexes: relations.get(node.id) ?? [],
    queryMatch: normalizedQuery.length === 0 || matchingNodeIds.has(node.id)
  })), [nodes, relations, normalizedQuery, matchingNodeIds]);
  const queryMatchIndexes = useMemo(
    () => rows.flatMap(({ queryMatch }, index) => queryMatch ? [index] : []),
    [rows]
  );
  const queryMatchCount = queryMatchIndexes.length;
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
  const queryNavigationKey = useMemo(
    () => knowledgeGraphA11yNavigationContextKey(
      normalizedQuery,
      safePageSize,
      selectedId,
      rows.map(({ node }) => node.id),
      queryMatchIndexes.map((index) => rows[index]?.node.id ?? "")
    ),
    [normalizedQuery, safePageSize, selectedId, rows, queryMatchIndexes]
  );
  const plannedNavigation = useMemo(() => ({
    contextKey: queryNavigationKey,
    ...planKnowledgeGraphA11yNavigation(
      normalizedQuery.length > 0,
      queryMatchIndexes,
      selectedIndex,
      safePageSize,
      nodePageCount
    )
  }), [
    queryNavigationKey,
    normalizedQuery,
    queryMatchIndexes,
    selectedIndex,
    safePageSize,
    nodePageCount
  ]);
  const [navigation, setNavigation] = useState(plannedNavigation);
  const activeNavigation = navigation.contextKey === queryNavigationKey ? navigation : plannedNavigation;
  const [queryFocusRequestId, setQueryFocusRequestId] = useState(null);
  const queryMatchTargetRef = useRef(null);
  useEffect(() => {
    setNavigation((current) => current.contextKey === queryNavigationKey ? current : plannedNavigation);
    setQueryFocusRequestId(null);
  }, [queryNavigationKey, plannedNavigation]);
  const currentNodePage = Math.min(
    activeNavigation.nodePage,
    nodePageCount - 1
  );
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize
  );
  const currentQueryMatchCursor = Math.min(
    activeNavigation.matchCursor,
    Math.max(0, queryMatchCount - 1)
  );
  const currentQueryMatchRowIndex = queryMatchIndexes[currentQueryMatchCursor];
  const navigatedQueryMatchNode = currentQueryMatchRowIndex === void 0 ? void 0 : rows[currentQueryMatchRowIndex]?.node;
  const currentPageStart = currentNodePage * safePageSize;
  const currentPageStop = currentPageStart + safePageSize;
  const currentQueryMatchNode = currentQueryMatchRowIndex !== void 0 && currentQueryMatchRowIndex >= currentPageStart && currentQueryMatchRowIndex < currentPageStop ? navigatedQueryMatchNode : void 0;
  useEffect(() => {
    if (queryFocusRequestId === null || currentQueryMatchNode?.id !== queryFocusRequestId || queryMatchTargetRef.current === null) return;
    queryMatchTargetRef.current.focus();
    setQueryFocusRequestId(null);
  }, [queryFocusRequestId, currentQueryMatchNode, currentNodePage]);
  const showQueryMatch = (cursor) => {
    const bounded = Math.max(0, Math.min(queryMatchCount - 1, cursor));
    const rowIndex = queryMatchIndexes[bounded];
    if (rowIndex === void 0) return;
    const targetId = rows[rowIndex]?.node.id;
    if (targetId === void 0) return;
    setNavigation({
      contextKey: queryNavigationKey,
      matchCursor: bounded,
      nodePage: Math.floor(rowIndex / safePageSize)
    });
    setQueryFocusRequestId(targetId);
  };
  const showNodePage = (page) => {
    const nodePage = Math.max(0, Math.min(nodePageCount - 1, page));
    const pageStart = nodePage * safePageSize;
    const pageStop = pageStart + safePageSize;
    const firstMatchOnPage = queryMatchIndexes.findIndex(
      (rowIndex) => rowIndex >= pageStart && rowIndex < pageStop
    );
    setNavigation({
      ...activeNavigation,
      contextKey: queryNavigationKey,
      matchCursor: firstMatchOnPage < 0 ? activeNavigation.matchCursor : firstMatchOnPage,
      nodePage
    });
  };
  return /* @__PURE__ */ jsxs("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ jsxs("p", { role: "note", children: [
      "Filtered view: showing ",
      view.counts.visibleNodes,
      " of ",
      view.counts.sourceNodes,
      " ",
      "nodes and ",
      view.counts.visibleEdges,
      " of ",
      view.counts.sourceEdges,
      " ",
      "relationships. Relationships excluded by kind: ",
      " ",
      view.counts.edgeKindFilteredEdges,
      ". Relationships excluded because a filtered endpoint is absent:",
      " ",
      view.counts.endpointPrunedEdges,
      "."
    ] }),
    normalizedQuery.length > 0 && /* @__PURE__ */ jsxs("p", { role: "status", children: [
      "Query emphasizes ",
      queryMatchCount,
      " of ",
      rows.length,
      " nodes; all nodes remain available below."
    ] }),
    normalizedQuery.length > 0 && queryMatchCount > 0 && /* @__PURE__ */ jsxs("nav", { "aria-label": "Knowledge graph query matches", children: [
      /* @__PURE__ */ jsx("p", { "aria-live": "polite", children: currentQueryMatchNode === void 0 ? `Node page ${currentNodePage + 1} has no current query match; use the query-match controls to navigate to one.` : `Query match ${currentQueryMatchCursor + 1} of ${queryMatchCount}: ${safeDiagnosticText(currentQueryMatchNode.label, 120)}. Node id ${safeDiagnosticText(currentQueryMatchNode.id, 120)}.` }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: currentQueryMatchCursor === 0,
          onClick: () => showQueryMatch(currentQueryMatchCursor - 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous query match"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: currentQueryMatchCursor + 1 >= queryMatchCount,
          onClick: () => showQueryMatch(currentQueryMatchCursor + 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Next query match"
        }
      ),
      currentQueryMatchNode === void 0 && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => showQueryMatch(currentQueryMatchCursor),
          style: { minWidth: 44, minHeight: 44 },
          children: "Go to current query match"
        }
      )
    ] }),
    rows.length === 0 ? /* @__PURE__ */ jsx("p", { role: "status", children: view === void 0 ? "This graph contains no nodes." : `This filtered view contains no nodes; the full source contains ${view.counts.sourceNodes}.` }) : /* @__PURE__ */ jsx("ul", { children: visibleRows.map(({ node, relationIndexes, queryMatch }, rowOffset) => {
      const rowIndex = currentNodePage * safePageSize + rowOffset;
      const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
      const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
      const omitted = relationIndexes.length - preview.length;
      const nodeMetadata = metadataSummary(node, corpusVisualMapping);
      return /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "cortexel-knowledge-graph-node",
            "aria-pressed": selectedId === node.id,
            "aria-current": currentQueryMatchNode?.id === node.id ? "true" : void 0,
            "aria-describedby": detailsId,
            ref: currentQueryMatchNode?.id === node.id ? queryMatchTargetRef : void 0,
            onClick: () => onSelect(
              toggledKnowledgeGraphSelection(selectedId, node.id)
            ),
            style: { minWidth: 44, minHeight: 44 },
            children: safeDiagnosticText(node.label, 240)
          }
        ),
        /* @__PURE__ */ jsxs("span", { id: detailsId, children: [
          safeDiagnosticText(node.kind, 80),
          ". Node id",
          " ",
          safeDiagnosticText(node.id, 120),
          ".",
          " ",
          normalizedQuery.length > 0 ? queryMatch ? currentQueryMatchNode?.id === node.id ? "Current navigated query match; visually emphasized. " : "Query match; visually emphasized. " : "Not a query match; visually de-emphasized but still present. " : "",
          nodeMetadata ? `${nodeMetadata}. ` : "",
          preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No relationships in this active view."
        ] }),
        selectedId === node.id && /* @__PURE__ */ jsx(
          MetadataDisclosure,
          {
            value: node,
            label: `node ${node.label}`,
            corpusVisualMapping
          }
        ),
        selectedId === node.id && relationIndexes.length > 0 && /* @__PURE__ */ jsx(
          RelationshipPager,
          {
            nodeId: node.id,
            relationIndexes,
            edges: validEdges,
            byId
          }
        )
      ] }, node.id);
    }) }),
    rows.length > safePageSize && /* @__PURE__ */ jsxs("nav", { "aria-label": "Knowledge graph node pages", children: [
      /* @__PURE__ */ jsxs("p", { "aria-live": "polite", children: [
        "Node page ",
        currentNodePage + 1,
        " of ",
        nodePageCount,
        "; ",
        rows.length,
        " nodes"
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: currentNodePage === 0,
          onClick: () => showNodePage(currentNodePage - 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous nodes"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: currentNodePage + 1 >= nodePageCount,
          onClick: () => showNodePage(currentNodePage + 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Next nodes"
        }
      )
    ] })
  ] });
}
function compareLegendEntries(a, b) {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  return a.color === b.color ? 0 : a.color < b.color ? -1 : 1;
}
function KnowledgeGraphLegend(props) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphLegend(props);
}
function KnowledgeGraphCorpusLegendInternal(props) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphLegend(props);
}
function renderKnowledgeGraphLegend({
  presentation,
  view,
  className,
  label = "Knowledge graph legend",
  themeMode = "dark"
}) {
  assertPreparedKnowledgeGraphPresentation(presentation);
  if (view !== void 0) assertPreparedKnowledgeGraphView(view, presentation);
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const { context } = presentation;
  const { nodeEntries, edgeEntries } = useMemo(() => {
    const nodeEntries2 = [];
    const edgeEntries2 = [];
    const nodeGroups = /* @__PURE__ */ new Map();
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const radius = normalizeGraphNodeRadius(node.radius);
      const radiusMeaning = radiusMeaningText(
        node,
        presentation.profile === "corpus_entity"
      );
      const nodeGlyph = node.nodeGlyph ?? "sphere_outline";
      const key = JSON.stringify([node.kind, node.color, radiusMeaning, nodeGlyph]);
      const entry = nodeGroups.get(key);
      if (entry) {
        entry.count += 1;
        entry.minRadius = Math.min(entry.minRadius, radius);
        entry.maxRadius = Math.max(entry.maxRadius, radius);
      } else {
        nodeGroups.set(key, {
          kind: node.kind,
          color: node.color,
          count: 1,
          minRadius: radius,
          maxRadius: radius,
          radiusMeaning,
          nodeGlyph
        });
      }
    }
    const edgeGroups = /* @__PURE__ */ new Map();
    const validEdges = filterGraphEdges(
      new Set(nodes.map(({ id }) => id)),
      edges
    );
    for (let index = 0; index < validEdges.length; index++) {
      const edge = validEdges[index];
      const directed = edge.directed !== false;
      const particles = edge.particles === true;
      const edgeStrokePattern = edge.edgeStrokePattern ?? "solid";
      const key = JSON.stringify([
        edge.kind,
        edge.color,
        directed,
        particles,
        edgeStrokePattern
      ]);
      const entry = edgeGroups.get(key);
      if (entry) entry.count += 1;
      else {
        edgeGroups.set(key, {
          kind: edge.kind,
          color: edge.color,
          directed,
          particles,
          edgeStrokePattern,
          count: 1
        });
      }
    }
    nodeEntries2.push(...[...nodeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || (a.radiusMeaning === b.radiusMeaning ? 0 : a.radiusMeaning < b.radiusMeaning ? -1 : 1)));
    edgeEntries2.push(...[...edgeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || Number(a.directed) - Number(b.directed) || Number(a.particles) - Number(b.particles)));
    return { nodeEntries: nodeEntries2, edgeEntries: edgeEntries2 };
  }, [nodes, edges, presentation.profile]);
  const swatchStyle = (color) => ({
    display: "inline-block",
    width: 16,
    height: 16,
    marginRight: 8,
    border: "1px solid currentColor",
    backgroundColor: color
  });
  return /* @__PURE__ */ jsxs("aside", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ jsxs("p", { role: "note", children: [
      "Filtered view: showing ",
      view.counts.visibleNodes,
      " of ",
      view.counts.sourceNodes,
      " ",
      "nodes and ",
      view.counts.visibleEdges,
      " of ",
      view.counts.sourceEdges,
      " ",
      "relationships."
    ] }),
    context && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Graph context" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Graph id" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_id, 160) }),
        /* @__PURE__ */ jsx("dt", { children: "Graph source" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_source, 200) }),
        /* @__PURE__ */ jsx("dt", { children: "Caller-declared snapshot namespace" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_snapshot_id, 200) }),
        /* @__PURE__ */ jsx("dt", { children: "Graph scope" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_scope, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Generated at" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.generated_at, 80) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { children: "Node kinds" }),
    nodeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No nodes in this active view." }) : /* @__PURE__ */ jsx("ul", { children: nodeEntries.map((entry) => {
      const renderedColor = knowledgeGraphContrastSafeColor(entry.color, themeMode);
      return /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: swatchStyle(renderedColor) }),
        safeDiagnosticText(entry.kind, 80),
        ": ",
        entry.count,
        " ",
        entry.count === 1 ? "node" : "nodes",
        "; source color",
        " ",
        safeDiagnosticText(entry.color, 80),
        "; intended undimmed scene color",
        " ",
        safeDiagnosticText(renderedColor, 80),
        "; glyph",
        " ",
        knowledgeGraphNodeGlyphDescription(entry.nodeGlyph),
        "; visual radius",
        " ",
        entry.minRadius === entry.maxRadius ? entry.minRadius : `${entry.minRadius}\u2013${entry.maxRadius}`,
        ";",
        " ",
        entry.radiusMeaning
      ] }, JSON.stringify([
        entry.kind,
        entry.color,
        entry.radiusMeaning,
        entry.nodeGlyph
      ]));
    }) }),
    /* @__PURE__ */ jsx("p", { children: "Relationship kinds" }),
    edgeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No relationships in this active view." }) : /* @__PURE__ */ jsx("ul", { children: edgeEntries.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          "aria-hidden": "true",
          style: swatchStyle(knowledgeGraphContrastSafeColor(entry.color, themeMode))
        }
      ),
      safeDiagnosticText(entry.kind, 80),
      ": ",
      entry.count,
      " ",
      entry.count === 1 ? "relationship" : "relationships",
      ";",
      " ",
      entry.directed ? "directed" : "undirected",
      "; source color",
      " ",
      safeDiagnosticText(entry.color, 80),
      "; intended undimmed scene color",
      " ",
      safeDiagnosticText(
        knowledgeGraphContrastSafeColor(entry.color, themeMode),
        80
      ),
      "; ",
      knowledgeGraphEdgeStrokeDescription(entry.edgeStrokePattern),
      entry.particles ? "; flow markers" : ""
    ] }, JSON.stringify([
      entry.kind,
      entry.color,
      entry.directed,
      entry.particles,
      entry.edgeStrokePattern
    ]))) }),
    /* @__PURE__ */ jsxs("p", { role: "note", children: [
      "The listed scene colors are the intended undimmed baseline. Glyph shells use",
      " ",
      themeMode === "light" ? "#0f172a" : "#f8fafc",
      " before dimming. Focus and query interactions dim peripheral node fills, glyph shells, relationships, arrows, and flow markers without changing their kind glyph, stroke pattern, direction, or DOM record. Layout positions and distances are schematic, not quantitative evidence."
    ] })
  ] });
}
function RelationshipPager({
  nodeId,
  relationIndexes,
  edges,
  byId
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => setPage(0), [nodeId]);
  useEffect(
    () => setPage((current) => Math.min(current, pageCount - 1)),
    [pageCount]
  );
  const start = currentPage * RELATION_PAGE_SIZE;
  return /* @__PURE__ */ jsxs("details", { children: [
    /* @__PURE__ */ jsxs("summary", { style: { minHeight: 44 }, children: [
      "Browse all ",
      relationIndexes.length,
      " relationships"
    ] }),
    /* @__PURE__ */ jsx("ul", { children: relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
      const edge = edges[edgeIndex];
      const humanLabel = edge.label ?? edge.kind;
      const edgeLabel = edge.id === void 0 ? `${humanLabel} relationship` : `${humanLabel} [${edge.id}]`;
      const relationshipKey = graphEdgeIdentityKey(edge);
      return /* @__PURE__ */ jsxs("li", { children: [
        relationshipText(nodeId, edge, byId),
        /* @__PURE__ */ jsx(MetadataDisclosure, { value: edge, label: `relationship ${edgeLabel}` })
      ] }, JSON.stringify([nodeId, relationshipKey]));
    }) }),
    /* @__PURE__ */ jsxs("p", { "aria-live": "polite", children: [
      "Page ",
      currentPage + 1,
      " of ",
      pageCount
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: currentPage === 0,
        onClick: () => setPage((current) => Math.max(0, current - 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Previous relationships"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: currentPage + 1 >= pageCount,
        onClick: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Next relationships"
      }
    )
  ] });
}

// react/KnowledgeGraphStaticRecordView.tsx
import { useEffect as useEffect2, useMemo as useMemo2, useState as useState2 } from "react";
import {
  assertPreparedCorpusKnowledgeGraphPresentation as assertPreparedCorpusKnowledgeGraphPresentation2,
  assertPreparedGenericKnowledgeGraphPresentation as assertPreparedGenericKnowledgeGraphPresentation2,
  assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView2,
  assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation2
} from "#cortexel-knowledge-graph-presentation-capability";
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var DEFAULT_STATIC_PAGE_SIZE = 10;
var MAX_STATIC_PAGE_SIZE = 25;
var STATIC_RECORD_INSTANCE_KEYS = /* @__PURE__ */ new WeakMap();
var nextStaticRecordInstanceKey = 0n;
function staticRecordInstanceKey(presentation) {
  const existing = STATIC_RECORD_INSTANCE_KEYS.get(presentation);
  if (existing !== void 0) return existing;
  const created = `cortexel-kg-record-${nextStaticRecordInstanceKey}`;
  nextStaticRecordInstanceKey += 1n;
  STATIC_RECORD_INSTANCE_KEYS.set(presentation, created);
  return created;
}
function boundedPageSize(value) {
  return Number.isSafeInteger(value) ? Math.max(1, Math.min(MAX_STATIC_PAGE_SIZE, value)) : DEFAULT_STATIC_PAGE_SIZE;
}
function codeUnitCompare(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}
function compareOptionalString(left, right) {
  if (left === right) return 0;
  if (left === void 0) return -1;
  if (right === void 0) return 1;
  return codeUnitCompare(left, right);
}
function compareEvidence(left, right) {
  const common = codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.evidence_id, right.evidence_id);
  if (common !== 0 || left.kind !== right.kind) return common;
  switch (left.kind) {
    case "graph_snapshot_record": {
      const matching = right;
      return codeUnitCompare(left.record_id, matching.record_id) || compareOptionalString(left.locator, matching.locator);
    }
    case "graph_node": {
      const matching = right;
      return codeUnitCompare(left.node_id, matching.node_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
    }
    case "citation": {
      const matching = right;
      return codeUnitCompare(left.paper_id, matching.paper_id) || codeUnitCompare(left.citation_id, matching.citation_id) || (left.page ?? -1) - (matching.page ?? -1) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt) || compareOptionalString(left.doi, matching.doi);
    }
    case "external_source": {
      const matching = right;
      return codeUnitCompare(left.source_id, matching.source_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
    }
  }
}
function EvidenceReference({ reference }) {
  return /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsxs2("dl", { children: [
    /* @__PURE__ */ jsx2("dt", { children: "Kind" }),
    /* @__PURE__ */ jsx2("dd", { children: reference.kind }),
    /* @__PURE__ */ jsx2("dt", { children: "Evidence id" }),
    /* @__PURE__ */ jsx2("dd", { children: reference.evidence_id }),
    reference.kind === "graph_snapshot_record" && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Record id" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.record_id })
    ] }),
    reference.kind === "graph_node" && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Referenced node id" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.node_id })
    ] }),
    reference.kind === "citation" && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Paper id" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.paper_id }),
      /* @__PURE__ */ jsx2("dt", { children: "Citation id" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.citation_id }),
      reference.page !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Page" }),
        /* @__PURE__ */ jsx2("dd", { children: reference.page })
      ] }),
      reference.doi !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
        /* @__PURE__ */ jsx2("dt", { children: "DOI" }),
        /* @__PURE__ */ jsx2("dd", { children: reference.doi })
      ] })
    ] }),
    reference.kind === "external_source" && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Source id" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.source_id })
    ] }),
    reference.locator !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Locator" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.locator })
    ] }),
    "excerpt" in reference && reference.excerpt !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Excerpt" }),
      /* @__PURE__ */ jsx2("dd", { children: reference.excerpt })
    ] })
  ] }) });
}
function scalarText(value) {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return String(value);
}
function attributeValue(value) {
  if (Array.isArray(value)) {
    return /* @__PURE__ */ jsx2("ol", { children: value.map((item, index) => /* @__PURE__ */ jsx2("li", { children: scalarText(item) }, index)) });
  }
  return scalarText(value);
}
function CompleteMetadata({ value }) {
  const attributeEntries = Object.entries(value.attributes ?? {}).sort(([left], [right]) => codeUnitCompare(left, right));
  const evidence = [...value.evidence ?? []].sort(compareEvidence);
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    value.detail !== void 0 && /* @__PURE__ */ jsxs2("p", { children: [
      "Detail: ",
      value.detail
    ] }),
    attributeEntries.length > 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("p", { children: "Attributes" }),
      /* @__PURE__ */ jsx2("dl", { children: attributeEntries.map(([key, item]) => /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("dt", { children: key }),
        /* @__PURE__ */ jsx2("dd", { children: attributeValue(item) })
      ] }, key)) })
    ] }),
    value.epistemic !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("p", { children: "Epistemic record" }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Status" }),
        /* @__PURE__ */ jsx2("dd", { children: value.epistemic.status }),
        /* @__PURE__ */ jsx2("dt", { children: "Advisory only" }),
        /* @__PURE__ */ jsx2("dd", { children: String(value.epistemic.advisory_only) }),
        /* @__PURE__ */ jsx2("dt", { children: "Paper-local evidence" }),
        /* @__PURE__ */ jsx2("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
        /* @__PURE__ */ jsx2("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx2("dd", { children: String(value.epistemic.calibrated_posterior) })
      ] })
    ] }),
    value.uncalibrated_score !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("p", { children: "Uncalibrated score" }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Meaning" }),
        /* @__PURE__ */ jsx2("dd", { children: value.uncalibrated_score.kind }),
        /* @__PURE__ */ jsx2("dt", { children: "Value" }),
        /* @__PURE__ */ jsx2("dd", { children: value.uncalibrated_score.value }),
        /* @__PURE__ */ jsx2("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx2("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
      ] })
    ] }),
    evidence.length > 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsxs2("p", { children: [
        "Evidence references (",
        evidence.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx2("ol", { children: evidence.map((reference) => /* @__PURE__ */ jsx2(EvidenceReference, { reference }, reference.evidence_id)) })
    ] })
  ] });
}
function compareNodes(left, right) {
  return codeUnitCompare(left.id, right.id) || codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.label, right.label);
}
function compareEdges(left, right) {
  if (left.id !== void 0 || right.id !== void 0) {
    const byId = compareOptionalString(left.id, right.id);
    if (byId !== 0) return byId;
  }
  return codeUnitCompare(left.source, right.source) || codeUnitCompare(left.target, right.target) || codeUnitCompare(left.kind, right.kind) || Number(left.directed !== false) - Number(right.directed !== false) || compareOptionalString(left.label, right.label);
}
function KnowledgeGraphStaticRecordView(props) {
  assertPreparedGenericKnowledgeGraphPresentation2(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}
function KnowledgeGraphCorpusStaticRecordViewInternal(props) {
  assertPreparedCorpusKnowledgeGraphPresentation2(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}
function renderKnowledgeGraphStaticRecordView(props) {
  assertPreparedKnowledgeGraphPresentation2(props.presentation);
  if (props.view !== void 0) {
    assertPreparedKnowledgeGraphView2(props.view, props.presentation);
  }
  return /* @__PURE__ */ jsx2(
    KnowledgeGraphStaticRecordViewInstance,
    {
      ...props
    },
    staticRecordInstanceKey(props.presentation)
  );
}
function KnowledgeGraphStaticRecordViewInstance({
  presentation,
  view,
  className,
  label = "Deterministic paginated knowledge graph record view",
  nodePageSize,
  edgePageSize
}) {
  const nodes = useMemo2(
    () => [...presentation.nodes].sort(compareNodes),
    [presentation.nodes]
  );
  const edges = useMemo2(
    () => [...presentation.edges].sort(compareEdges),
    [presentation.edges]
  );
  const safeNodePageSize = boundedPageSize(nodePageSize);
  const safeEdgePageSize = boundedPageSize(edgePageSize);
  const [nodePage, setNodePage] = useState2(0);
  const [edgePage, setEdgePage] = useState2(0);
  const nodePageCount = Math.max(1, Math.ceil(nodes.length / safeNodePageSize));
  const edgePageCount = Math.max(1, Math.ceil(edges.length / safeEdgePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const currentEdgePage = Math.min(edgePage, edgePageCount - 1);
  useEffect2(() => {
    setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [nodePageCount]);
  useEffect2(() => {
    setEdgePage((page) => Math.min(page, edgePageCount - 1));
  }, [edgePageCount]);
  const visibleNodes = nodes.slice(
    currentNodePage * safeNodePageSize,
    (currentNodePage + 1) * safeNodePageSize
  );
  const visibleEdges = edges.slice(
    currentEdgePage * safeEdgePageSize,
    (currentEdgePage + 1) * safeEdgePageSize
  );
  return /* @__PURE__ */ jsxs2("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ jsxs2("div", { role: "note", children: [
      /* @__PURE__ */ jsxs2("p", { children: [
        "Filtered interactive view: showing ",
        view.counts.visibleNodes,
        " of",
        " ",
        view.counts.sourceNodes,
        " nodes and ",
        view.counts.visibleEdges,
        " of",
        " ",
        view.counts.sourceEdges,
        " relationships. The paginated records below remain the full source presentation."
      ] }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Requested node kinds" }),
        /* @__PURE__ */ jsx2("dd", { children: view.policy.nodeKinds === "all" ? "all" : view.policy.nodeKinds.length === 0 ? "none" : view.policy.nodeKinds.join(", ") }),
        /* @__PURE__ */ jsx2("dt", { children: "Requested relationship kinds" }),
        /* @__PURE__ */ jsx2("dd", { children: view.policy.edgeKinds === "all" ? "all" : view.policy.edgeKinds.length === 0 ? "none" : view.policy.edgeKinds.join(", ") }),
        /* @__PURE__ */ jsx2("dt", { children: "Endpoint-pruned relationships" }),
        /* @__PURE__ */ jsx2("dd", { children: view.counts.endpointPrunedEdges }),
        /* @__PURE__ */ jsx2("dt", { children: "Kind-filtered relationships" }),
        /* @__PURE__ */ jsx2("dd", { children: view.counts.edgeKindFilteredEdges })
      ] })
    ] }),
    /* @__PURE__ */ jsx2("h3", { children: "Presentation metadata" }),
    /* @__PURE__ */ jsxs2("dl", { children: [
      /* @__PURE__ */ jsx2("dt", { children: "Prepared contract" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.contract }),
      /* @__PURE__ */ jsx2("dt", { children: "Profile" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.profile }),
      /* @__PURE__ */ jsx2("dt", { children: "Graph lifecycle identity" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.graphIdentity }),
      /* @__PURE__ */ jsx2("dt", { children: "Input boundary" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.inputAssurance.boundary }),
      /* @__PURE__ */ jsx2("dt", { children: "Duplicate-member assurance" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.inputAssurance.duplicateMembers }),
      /* @__PURE__ */ jsx2("dt", { children: "Proxy-trap assurance" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.inputAssurance.proxyTrapFreedom }),
      /* @__PURE__ */ jsx2("dt", { children: "Visual mapping authority" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.mappingAuthority.kind }),
      presentation.mappingAuthority.kind === "corpus_visual_mapping" && /* @__PURE__ */ jsxs2(Fragment2, { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Presentation invariants" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.mappingAuthority.presentationInvariants }),
        /* @__PURE__ */ jsx2("dt", { children: "Derivation authentication" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.mappingAuthority.derivationAuthentication })
      ] }),
      /* @__PURE__ */ jsx2("dt", { children: "Scientific authority" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.mappingAuthority.scientificAuthority }),
      /* @__PURE__ */ jsx2("dt", { children: "Retained input occurrences" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.budget.retainedOccurrences }),
      /* @__PURE__ */ jsx2("dt", { children: "Accepted source string code units" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.budget.sourceStringCodeUnits }),
      /* @__PURE__ */ jsx2("dt", { children: "Inspection work" }),
      /* @__PURE__ */ jsx2("dd", { children: presentation.budget.inspectionWork })
    ] }),
    presentation.context !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("p", { children: "Caller-declared graph context" }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Graph id" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.context.graph_id }),
        /* @__PURE__ */ jsx2("dt", { children: "Graph source" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.context.graph_source }),
        /* @__PURE__ */ jsx2("dt", { children: "Caller-declared snapshot namespace" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.context.graph_snapshot_id }),
        /* @__PURE__ */ jsx2("dt", { children: "Graph scope" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.context.graph_scope }),
        /* @__PURE__ */ jsx2("dt", { children: "Generated at" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.context.generated_at })
      ] })
    ] }),
    /* @__PURE__ */ jsx2("p", { role: "note", children: "This view preserves caller-supplied reference identifiers but does not resolve, authenticate, or establish custody for them. It contains no force-layout coordinates; visual positions and distances are not evidence." }),
    /* @__PURE__ */ jsxs2("h3", { children: [
      "Nodes (",
      nodes.length,
      ")"
    ] }),
    nodes.length === 0 && /* @__PURE__ */ jsx2("p", { children: "This source presentation contains no nodes." }),
    /* @__PURE__ */ jsx2("ol", { children: visibleNodes.map((node) => /* @__PURE__ */ jsxs2("li", { children: [
      /* @__PURE__ */ jsx2("h4", { children: node.label }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        /* @__PURE__ */ jsx2("dt", { children: "Node id" }),
        /* @__PURE__ */ jsx2("dd", { children: node.id }),
        /* @__PURE__ */ jsx2("dt", { children: "Kind" }),
        /* @__PURE__ */ jsx2("dd", { children: node.kind }),
        /* @__PURE__ */ jsx2("dt", { children: "Visual color" }),
        /* @__PURE__ */ jsx2("dd", { children: node.color }),
        /* @__PURE__ */ jsx2("dt", { children: "Visual glyph" }),
        /* @__PURE__ */ jsx2("dd", { children: node.nodeGlyph ?? "sphere_outline" }),
        /* @__PURE__ */ jsx2("dt", { children: "Visual radius" }),
        /* @__PURE__ */ jsx2("dd", { children: node.radius }),
        /* @__PURE__ */ jsx2("dt", { children: "Radius meaning" }),
        /* @__PURE__ */ jsx2("dd", { children: presentation.profile === "corpus_entity" ? node.radiusMeaning : `Caller-declared: ${node.radiusMeaning ?? "visual size has no declared quantitative interpretation."}` })
      ] }),
      /* @__PURE__ */ jsx2(CompleteMetadata, { value: node })
    ] }, node.id)) }),
    nodes.length > safeNodePageSize && /* @__PURE__ */ jsxs2("nav", { "aria-label": "Static record node pages", children: [
      /* @__PURE__ */ jsxs2("p", { "aria-live": "polite", children: [
        "Node page ",
        currentNodePage + 1,
        " of ",
        nodePageCount
      ] }),
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentNodePage === 0,
          onClick: () => setNodePage(Math.max(0, currentNodePage - 1)),
          children: "Previous node records"
        }
      ),
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentNodePage + 1 >= nodePageCount,
          onClick: () => setNodePage(
            Math.min(nodePageCount - 1, currentNodePage + 1)
          ),
          children: "Next node records"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs2("h3", { children: [
      "Relationships (",
      edges.length,
      ")"
    ] }),
    edges.length === 0 && /* @__PURE__ */ jsx2("p", { children: "This source presentation contains no relationships." }),
    /* @__PURE__ */ jsx2("ol", { children: visibleEdges.map((edge) => /* @__PURE__ */ jsxs2("li", { children: [
      /* @__PURE__ */ jsx2("h4", { children: edge.label ?? edge.kind }),
      /* @__PURE__ */ jsxs2("dl", { children: [
        edge.id !== void 0 && /* @__PURE__ */ jsxs2(Fragment2, { children: [
          /* @__PURE__ */ jsx2("dt", { children: "Assertion id" }),
          /* @__PURE__ */ jsx2("dd", { children: edge.id })
        ] }),
        /* @__PURE__ */ jsx2("dt", { children: "Source node id" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.source }),
        /* @__PURE__ */ jsx2("dt", { children: "Target node id" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.target }),
        /* @__PURE__ */ jsx2("dt", { children: "Kind" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.kind }),
        /* @__PURE__ */ jsx2("dt", { children: "Direction" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.directed === false ? "undirected" : "source to target" }),
        /* @__PURE__ */ jsx2("dt", { children: "Visual color" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.color }),
        /* @__PURE__ */ jsx2("dt", { children: "Visual stroke pattern" }),
        /* @__PURE__ */ jsx2("dd", { children: edge.edgeStrokePattern ?? "solid" }),
        /* @__PURE__ */ jsx2("dt", { children: "Flow-marker encoding enabled" }),
        /* @__PURE__ */ jsx2("dd", { children: String(edge.particles === true) })
      ] }),
      /* @__PURE__ */ jsx2(CompleteMetadata, { value: edge })
    ] }, graphEdgeIdentityKey(edge))) }),
    edges.length > safeEdgePageSize && /* @__PURE__ */ jsxs2("nav", { "aria-label": "Static record relationship pages", children: [
      /* @__PURE__ */ jsxs2("p", { "aria-live": "polite", children: [
        "Relationship page ",
        currentEdgePage + 1,
        " of ",
        edgePageCount
      ] }),
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentEdgePage === 0,
          onClick: () => setEdgePage(Math.max(0, currentEdgePage - 1)),
          children: "Previous relationship records"
        }
      ),
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentEdgePage + 1 >= edgePageCount,
          onClick: () => setEdgePage(
            Math.min(edgePageCount - 1, currentEdgePage + 1)
          ),
          children: "Next relationship records"
        }
      )
    ] })
  ] });
}

// react/KnowledgeGraphAccessibleFigure.tsx
import {
  Component,
  useEffect as useEffect3,
  useId as useId2,
  useMemo as useMemo3,
  useRef as useRef2
} from "react";
import {
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode2,
  prepareKnowledgeGraphView
} from "#cortexel-knowledge-graph-presentation-capability";
import { Fragment as Fragment3, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var KnowledgeGraphVisualBoundary = class extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error, _info) {
  }
  componentDidUpdate(previous) {
    if ((previous.resetToken !== this.props.resetToken || !Object.is(previous.retryToken, this.props.retryToken)) && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
};
function KnowledgeGraphVisualMount({ renderVisual, scene, context }) {
  return /* @__PURE__ */ jsx3(Fragment3, { children: renderVisual(scene, context) });
}
function inputBoundaryFailure(message) {
  return Object.freeze({
    ok: false,
    errors: Object.freeze([Object.freeze({
      code: "input_boundary_rejected",
      path: "spec/specJson",
      message
    })])
  });
}
function KnowledgeGraphAccessibleFigure(props) {
  const {
    renderVisual,
    selectedId,
    onSelect,
    hoverId,
    onHover,
    visualAvailable = true,
    visualRetryKey,
    viewPolicy,
    query = "",
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
    label = "Interactive knowledge graph"
  } = props;
  const hasSpec = Object.hasOwn(props, "spec");
  const hasSpecJson = Object.hasOwn(props, "specJson");
  const spec = hasSpec ? props.spec : void 0;
  const specJson = hasSpecJson ? props.specJson : void 0;
  const preparedSource = useMemo3(
    () => {
      if (hasSpec === hasSpecJson) {
        return inputBoundaryFailure(
          "provide exactly one own input property: spec or specJson"
        );
      }
      if (hasSpecJson) {
        if (typeof specJson !== "string") {
          return inputBoundaryFailure("specJson must be a string");
        }
        return prepareCorpusKnowledgeGraphFigureJson(specJson, { activePalette });
      }
      return prepareCorpusKnowledgeGraphFigure(spec, { activePalette });
    },
    [hasSpec, hasSpecJson, spec, specJson, activePalette]
  );
  const preparedView = useMemo3(() => {
    if (!preparedSource.ok || viewPolicy === void 0) {
      return { ok: true, view: void 0 };
    }
    try {
      return {
        ok: true,
        view: prepareKnowledgeGraphView(preparedSource.presentation, viewPolicy)
      };
    } catch (error) {
      return {
        ok: false,
        message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`
      };
    }
  }, [preparedSource, viewPolicy]);
  const hostPolicy = useMemo3(
    () => {
      if (!preparedSource.ok || !preparedView.ok) return void 0;
      const activeNodes = preparedView.view?.nodes ?? preparedSource.presentation.nodes;
      const activeEdges = preparedView.view?.edges ?? preparedSource.presentation.edges;
      return Object.freeze({
        ...preparedSource.hostPolicy,
        view: preparedView.view,
        liveForceAvailability: knowledgeGraphLiveForceAvailability(
          activeNodes.length,
          activeEdges.length
        )
      });
    },
    [preparedSource, preparedView]
  );
  const captionId = `cortexel-kg-caption-${useId2().replace(/:/gu, "")}`;
  const selectionInvalidation = useRef2(null);
  const hoverInvalidation = useRef2(null);
  const activeToken = preparedSource.ok && preparedView.ok ? preparedView.view ?? preparedSource.presentation : void 0;
  const selectedIsInvalid = preparedSource.ok && preparedView.ok && selectedId !== null && !(preparedView.view === void 0 ? knowledgeGraphPresentationContainsNode(preparedSource.presentation, selectedId) : knowledgeGraphViewContainsNode2(
    preparedView.view,
    preparedSource.presentation,
    selectedId
  ));
  const hoverIsInvalid = preparedSource.ok && preparedView.ok && hoverId !== null && !(preparedView.view === void 0 ? knowledgeGraphPresentationContainsNode(preparedSource.presentation, hoverId) : knowledgeGraphViewContainsNode2(
    preparedView.view,
    preparedSource.presentation,
    hoverId
  ));
  useEffect3(() => {
    if (!selectedIsInvalid || activeToken === void 0 || selectedId === null) {
      selectionInvalidation.current = null;
      return;
    }
    const previous = selectionInvalidation.current;
    if (previous?.token === activeToken && previous.id === selectedId) return;
    selectionInvalidation.current = { token: activeToken, id: selectedId };
    onSelect(null);
  }, [activeToken, onSelect, selectedId, selectedIsInvalid]);
  useEffect3(() => {
    if (!hoverIsInvalid || activeToken === void 0 || hoverId === null) {
      hoverInvalidation.current = null;
      return;
    }
    const previous = hoverInvalidation.current;
    if (previous?.token === activeToken && previous.id === hoverId) return;
    hoverInvalidation.current = { token: activeToken, id: hoverId };
    onHover(null);
  }, [activeToken, hoverId, hoverIsInvalid, onHover]);
  if (!preparedSource.ok) {
    return /* @__PURE__ */ jsxs3("section", { role: "alert", "aria-label": "Invalid knowledge graph figure", children: [
      /* @__PURE__ */ jsx3("h3", { children: "Knowledge graph figure rejected" }),
      /* @__PURE__ */ jsx3("ul", { children: preparedSource.errors.map((error, index) => /* @__PURE__ */ jsx3("li", { children: safeDiagnosticText(`${error.path}: ${error.message}`, 840) }, index)) })
    ] });
  }
  if (!preparedView.ok) {
    return /* @__PURE__ */ jsxs3(
      "figure",
      {
        className,
        "aria-label": safeDiagnosticText(label, 240),
        "aria-describedby": captionId,
        children: [
          /* @__PURE__ */ jsx3("figcaption", { id: captionId, children: /* @__PURE__ */ jsx3("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: preparedSource.caption }) }),
          /* @__PURE__ */ jsxs3("section", { role: "alert", "aria-label": "Invalid knowledge graph view policy", children: [
            /* @__PURE__ */ jsx3("h3", { children: "Knowledge graph view rejected" }),
            /* @__PURE__ */ jsx3("p", { children: safeDiagnosticText(`viewPolicy: ${preparedView.message}`, 840) })
          ] }),
          /* @__PURE__ */ jsx3(
            KnowledgeGraphCorpusStaticRecordViewInternal,
            {
              presentation: preparedSource.presentation,
              nodePageSize: recordNodePageSize,
              edgePageSize: recordEdgePageSize
            }
          )
        ]
      }
    );
  }
  if (hostPolicy === void 0) {
    throw new Error("knowledge-graph host policy invariant failed");
  }
  const { caption, presentation } = preparedSource;
  const { view } = preparedView;
  const visualUnavailableStatus = /* @__PURE__ */ jsx3("p", { role: "status", children: "The host-owned interactive 3D view is unavailable. The paginated graph-record browser remains below; its controls expose every accepted record after hydration." });
  const { liveForceAvailability } = hostPolicy;
  const liveForceAvailable = liveForceAvailability.status === "available";
  const liveForceLimitStatus = /* @__PURE__ */ jsxs3("p", { role: "status", children: [
    "The host-owned interactive 3D force view was not mounted: this active view has",
    " ",
    liveForceAvailability.nodeCount,
    " nodes and ",
    liveForceAvailability.edgeCount,
    " ",
    "relationships; the reviewed main-thread ceiling is",
    " ",
    liveForceAvailability.maxNodes,
    " nodes and ",
    liveForceAvailability.maxEdges,
    " ",
    "relationships. If an available exact kind filter reduces this source below the ceiling, that filtered view can mount the visual; some single-kind sources have no nonempty eligible view. The bound caption, legend, interactive DOM controls, and paginated source-record browser remain below; after hydration the browser controls expose every accepted source record."
  ] });
  const scene = liveForceAvailable ? /* @__PURE__ */ jsx3(
    KnowledgeGraphCorpus3DSceneInternal,
    {
      presentation,
      view,
      selectedId,
      query,
      onSelect,
      hoverId,
      onHover,
      controlsRef,
      autoFrame,
      flyToSelection,
      labelColor,
      particleColor,
      themeMode: hostPolicy.themeMode,
      reducedMotion
    }
  ) : null;
  return /* @__PURE__ */ jsxs3(
    "figure",
    {
      className,
      "aria-label": safeDiagnosticText(label, 240),
      "aria-describedby": captionId,
      children: [
        /* @__PURE__ */ jsx3("figcaption", { id: captionId, children: /* @__PURE__ */ jsx3("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: caption }) }),
        view !== void 0 && /* @__PURE__ */ jsxs3("p", { role: "note", children: [
          "Filtered view: showing ",
          view.counts.visibleNodes,
          " of ",
          view.counts.sourceNodes,
          " ",
          "nodes and ",
          view.counts.visibleEdges,
          " of ",
          view.counts.sourceEdges,
          " ",
          "relationships. Relationships excluded by kind: ",
          " ",
          view.counts.edgeKindFilteredEdges,
          "; excluded because an endpoint is hidden:",
          " ",
          view.counts.endpointPrunedEdges,
          ". The caption and record browser remain bound to the full source."
        ] }),
        visualAvailable && liveForceAvailable && scene !== null ? /* @__PURE__ */ jsx3(
          KnowledgeGraphVisualBoundary,
          {
            resetToken: view ?? presentation,
            retryToken: visualRetryKey,
            fallback: visualUnavailableStatus,
            children: /* @__PURE__ */ jsx3(
              KnowledgeGraphVisualMount,
              {
                renderVisual,
                scene,
                context: hostPolicy
              }
            )
          }
        ) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus,
        /* @__PURE__ */ jsx3(
          KnowledgeGraphCorpusLegendInternal,
          {
            presentation,
            view,
            themeMode: hostPolicy.themeMode
          }
        ),
        /* @__PURE__ */ jsx3(
          KnowledgeGraphCorpusA11yListInternal,
          {
            presentation,
            view,
            selectedId,
            onSelect,
            query,
            nodePageSize
          }
        ),
        /* @__PURE__ */ jsx3(
          KnowledgeGraphCorpusStaticRecordViewInternal,
          {
            presentation,
            view,
            nodePageSize: recordNodePageSize,
            edgePageSize: recordEdgePageSize
          }
        )
      ]
    }
  );
}

// react/KnowledgeGraph3DScene.tsx
import {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  KnowledgeGraphPresentationJsonError,
  assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView4,
  assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation4,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphPresentationContainsNode as knowledgeGraphPresentationContainsNode2,
  knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode4,
  parseKnowledgeGraphPresentationJson,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView as prepareKnowledgeGraphView2,
  serializePreparedKnowledgeGraphPresentation
} from "#cortexel-knowledge-graph-presentation-capability";
import { Fragment as Fragment4, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var PARTICLES_PER_EDGE = 4;
var GRAPH_DIRECTION_MARKER_PADDING = 2;
var GRAPH_LAYOUT_SETTLED_ALPHA = 8e-3;
var MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
var FALLBACK_COLOR = "#64748b";
var MAX_REMEMBERED_POSITIONS = 5e3;
var _dummy = new THREE2.Object3D();
var _color = new THREE2.Color();
var _darkDimTarget = new THREE2.Color("#030711");
var _lightDimTarget = new THREE2.Color("#f8fafc");
var _a = new THREE2.Vector3();
var _b = new THREE2.Vector3();
var _curveControl = new THREE2.Vector3();
var _curvePoint = new THREE2.Vector3();
var _curveNext = new THREE2.Vector3();
var _direction = new THREE2.Vector3();
var _up = new THREE2.Vector3(0, 1, 0);
var _box = new THREE2.Box3();
var _sphere = new THREE2.Sphere();
var _layoutClockResult = { ticks: 0, remainderSeconds: 0 };
var _cameraFitResult = { distance: 0, orthographicZoom: void 0 };
var _cameraClippingResult = { near: 0, far: 0 };
var _perspectiveAutoFrameProjection = {
  kind: "perspective",
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  effectiveFovMethodCanonical: false,
  webGlCoordinateSystem: false,
  fovDegrees: 0,
  aspect: 0,
  zoom: 0,
  near: 0,
  far: 0,
  filmOffset: 0,
  projectionMatrixElements: []
};
var _orthographicAutoFrameProjection = {
  kind: "orthographic",
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  webGlCoordinateSystem: false,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  zoom: 0,
  near: 0,
  far: 0,
  projectionMatrixElements: []
};
var selectCamera = (state) => state.camera;
var selectRenderer = (state) => state.gl;
var selectInvalidate = (state) => state.invalidate;
var disableKnowledgeGraphGlyphRaycast = () => {
};
function devWarn(msg) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") {
    return;
  }
  if (typeof console !== "undefined" && console.warn) console.warn(`[cortexel] ${msg}`);
}
function dim(hex, amount, themeMode) {
  _color.set(FALLBACK_COLOR);
  _color.set(hex);
  return _color.lerp(
    themeMode === "light" ? _lightDimTarget : _darkDimTarget,
    amount
  );
}
function FocusLabelSprite({
  spriteRef,
  text,
  color,
  themeMode,
  invalidate
}) {
  const label = safeDiagnosticText(text, 120);
  const materialRef = useRef3(null);
  useLayoutEffect(() => {
    const sprite = spriteRef.current;
    const material = materialRef.current;
    if (!sprite || !material) return void 0;
    return installFocusLabelResource({
      sprite,
      material,
      label,
      color,
      themeMode,
      invalidate
    });
  }, [label, color, themeMode, invalidate]);
  return /* @__PURE__ */ jsx4(
    "sprite",
    {
      ref: spriteRef,
      visible: false,
      frustumCulled: false,
      renderOrder: 1e3,
      children: /* @__PURE__ */ jsx4(
        "spriteMaterial",
        {
          ref: materialRef,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        }
      )
    }
  );
}
function setEdgeCurve(source, target, lane) {
  _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
  _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
  graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}
function updateKnowledgeGraphGlyphMatrices(glyphMesh, nodeIndexes, simNodes, focus, focusSet) {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = simNodes[nodeIndexes[glyphIndex]];
    const scale = knowledgeGraphRenderedNodeScale(
      focus !== null && (node.id === focus || focusSet?.has(node.id) === true)
    );
    _dummy.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(node.r * scale);
    _dummy.updateMatrix();
    glyphMesh.setMatrixAt(glyphIndex, _dummy.matrix);
  }
  glyphMesh.instanceMatrix.needsUpdate = true;
  glyphMesh.boundingSphere = null;
}
function updateKnowledgeGraphGlyphColors(glyphMesh, nodeIndexes, visualNodes, glyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode) {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = visualNodes[nodeIndexes[glyphIndex]];
    const amount = knowledgeGraphNodeEmphasisDimAmount(
      node.id,
      focus,
      focusSet,
      queryActive,
      queryMatchIds
    );
    glyphMesh.setColorAt(glyphIndex, dim(glyphColor, amount, themeMode));
  }
  if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
}
function KnowledgeGraph3DScene(props) {
  assertPreparedGenericKnowledgeGraphPresentation3(props.presentation);
  if (props.view !== void 0) {
    assertPreparedKnowledgeGraphView3(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}
function KnowledgeGraphCorpus3DSceneInternal(props) {
  assertPreparedCorpusKnowledgeGraphPresentation3(props.presentation);
  if (props.view !== void 0) {
    assertPreparedKnowledgeGraphView3(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}
function renderKnowledgeGraph3DScene(props) {
  const { presentation, view, ...interactionProps } = props;
  assertPreparedKnowledgeGraphPresentation3(presentation);
  if (view !== void 0) assertPreparedKnowledgeGraphView3(view, presentation);
  const { graphIdentity } = presentation;
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const selectedId = view !== void 0 && props.selectedId !== null && !knowledgeGraphViewContainsNode3(view, presentation, props.selectedId) ? null : props.selectedId;
  const hoverId = view !== void 0 && props.hoverId !== null && !knowledgeGraphViewContainsNode3(view, presentation, props.hoverId) ? null : props.hoverId;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  assertKnowledgeGraphNodeReference(props.hoverId, "knowledge-graph hover id");
  assertKnowledgeGraphColor(props.labelColor, "knowledge-graph label color");
  assertKnowledgeGraphColor(props.particleColor, "knowledge-graph particle color");
  return /* @__PURE__ */ jsx4(
    KnowledgeGraph3DSceneInstance,
    {
      ...interactionProps,
      selectedId,
      hoverId,
      autoFrame: nodes.length > 0 ? props.autoFrame : false,
      graphIdentity,
      nodes,
      edges
    },
    graphIdentity
  );
}
function KnowledgeGraph3DSceneInstance({
  graphIdentity,
  nodes,
  edges,
  selectedId,
  query,
  onSelect,
  hoverId,
  onHover,
  controlsRef,
  autoFrame = false,
  flyToSelection = false,
  labelColor,
  particleColor,
  themeMode = "dark",
  reducedMotion = false
}) {
  const meshRef = useRef3(null);
  const linesRef = useRef3(null);
  const particlesRef = useRef3(null);
  const arrowsRef = useRef3(null);
  const sphereGlyphsRef = useRef3(null);
  const boxGlyphsRef = useRef3(null);
  const diamondGlyphsRef = useRef3(null);
  const labelSpriteRef = useRef3(null);
  const sceneGroupRef = useRef3(null);
  const camera = useThree(selectCamera);
  const gl = useThree(selectRenderer);
  const invalidate = useThree(selectInvalidate);
  const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
  const perspectiveCamera = camera;
  const orthographicCamera = camera;
  const resolvedLabelColor = labelColor ?? (themeMode === "light" ? "#0f172a" : "#e2e8f0");
  const resolvedParticleColor = particleColor ?? (themeMode === "light" ? "#0369a1" : "#8fd3ff");
  const resolvedGlyphColor = themeMode === "light" ? "#0f172a" : "#f8fafc";
  useEffect4(() => {
    if (autoFrame && cameraProjectionKind === null) {
      devWarn(
        "knowledge-graph auto-frame supports only perspective and orthographic cameras"
      );
    }
  }, [autoFrame, cameraProjectionKind]);
  const [posMap] = useState3(() => ({
    current: /* @__PURE__ */ new Map()
  }));
  const readyGraphKeyRef = useRef3(null);
  const autoFrameStageRef = useRef3(0);
  const flyToIdRef = useRef3(null);
  const onHoverRef = useRef3(onHover);
  const hoverIdRef = useRef3(hoverId);
  useLayoutEffect(() => {
    onHoverRef.current = onHover;
    hoverIdRef.current = hoverId;
  }, [onHover, hoverId]);
  useEffect4(() => () => {
    if (hoverIdRef.current === null) return;
    hoverIdRef.current = null;
    onHoverRef.current(null);
  }, []);
  const attachedControlsRef = useRef3(null);
  const [onUserGrab] = useState3(
    () => () => {
      autoFrameStageRef.current = 2;
      flyToIdRef.current = null;
    }
  );
  useEffect4(
    () => () => {
      synchronizeKnowledgeGraphControlsListener(
        attachedControlsRef,
        null,
        onUserGrab
      );
    },
    [onUserGrab]
  );
  const layoutInput = useMemo4(
    () => snapshotGraphLayoutInputs(nodes, edges),
    [nodes, edges]
  );
  const graphKey = layoutInput.graphKey;
  const normalizedQuery = useMemo4(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = useMemo4(
    () => graphQueryMatchIds(nodes, normalizedQuery, edges),
    [nodes, normalizedQuery, edges]
  );
  const queryActive = normalizedQuery.length > 0;
  const visualNodes = useMemo4(
    () => nodes.map(({ id, label, color, nodeGlyph }) => ({
      id,
      label,
      color: knowledgeGraphContrastSafeColor(color, themeMode),
      nodeGlyph: nodeGlyph ?? "sphere_outline"
    })),
    [nodes, themeMode]
  );
  const glyphNodeIndexes = useMemo4(() => ({
    sphere: visualNodes.flatMap((node, index2) => node.nodeGlyph === "sphere_outline" ? [index2] : []),
    box: visualNodes.flatMap((node, index2) => node.nodeGlyph === "box_shell" ? [index2] : []),
    diamond: visualNodes.flatMap((node, index2) => node.nodeGlyph === "diamond_shell" ? [index2] : [])
  }), [visualNodes]);
  const { layoutNodes, simLinks, validEdges, edgeLanes, index } = useMemo4(() => {
    const index2 = /* @__PURE__ */ new Map();
    const layoutNodes2 = layoutInput.nodes.map((n, i) => {
      index2.set(n.id, i);
      return { id: n.id, radius: n.radius };
    });
    const validEdges2 = filterGraphEdges(new Set(index2.keys()), layoutInput.edges);
    const edgeLanes2 = assignGraphEdgeLanes(validEdges2);
    const simLinks2 = uniqueGraphTopologyLinks(validEdges2);
    return { layoutNodes: layoutNodes2, simLinks: simLinks2, validEdges: validEdges2, edgeLanes: edgeLanes2, index: index2 };
  }, [graphKey]);
  const neighbors = useMemo4(
    () => buildAdjacency(new Set(index.keys()), validEdges),
    [index, validEdges]
  );
  useEffect4(() => {
    if (hoverId == null || !index.has(hoverId)) return;
    const element = gl.domElement;
    const previous = element.style.cursor;
    element.style.cursor = "pointer";
    return () => {
      element.style.cursor = previous;
    };
  }, [gl, hoverId, index]);
  const flowEdges = useMemo4(
    () => edgeLanes.filter(({ edge }) => edge.particles),
    [edgeLanes]
  );
  const directedEdges = useMemo4(
    () => edgeLanes.filter(({ edge }) => edge.directed !== false),
    [edgeLanes]
  );
  const edgeDisplayColors = useMemo4(
    () => validEdges.map((edge) => knowledgeGraphContrastSafeColor(edge.color, themeMode)),
    [validEdges, themeMode]
  );
  const particleDistribution = useMemo4(
    () => planFlowParticleDistribution(
      flowEdges.length,
      PARTICLES_PER_EDGE,
      MAX_PARTICLES
    ),
    [flowEdges.length]
  );
  const particleCount = particleDistribution.total;
  useEffect4(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap at four markers each; marker density is reduced evenly and every flow edge retains at least one marker.`
      );
    }
  }, [flowEdges.length]);
  const visibleLineSegmentCount = useMemo4(
    () => validEdges.reduce((count, edge) => {
      let visible = 0;
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (knowledgeGraphEdgeStrokeSegmentVisible(
          edge.edgeStrokePattern ?? "solid",
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS
        )) visible++;
      }
      return count + visible;
    }, 0),
    [validEdges]
  );
  const linePos = useMemo4(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount]
  );
  const lineCol = useMemo4(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount]
  );
  useLayoutEffect(() => {
    meshRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    sphereGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    boxGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    diamondGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    arrowsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    particlesRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    const position = linesRef.current?.geometry.getAttribute("position");
    if (position instanceof THREE2.BufferAttribute) {
      position.setUsage(THREE2.DynamicDrawUsage);
    }
  }, [
    linePos,
    nodes.length,
    directedEdges.length,
    particleCount,
    glyphNodeIndexes.sphere.length,
    glyphNodeIndexes.box.length,
    glyphNodeIndexes.diamond.length
  ]);
  const layoutRuntimeRef = useRef3(null);
  const layoutTickAccumulatorRef = useRef3(0);
  const geometryDirtyRef = useRef3(true);
  const flowPhaseRef = useRef3(0);
  useEffect4(() => {
    const plan = planGraphLayoutCache(
      layoutNodes,
      posMap.current,
      MAX_REMEMBERED_POSITIONS
    );
    const simNodes = plan.nodes;
    const runtimeLinks = simLinks.map(({ source, target }) => ({ source, target }));
    const linkForce = forceLink(runtimeLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = forceSimulation(simNodes, 3).force("charge", forceManyBody().strength(-140).distanceMax(600)).force("link", linkForce).force("center", forceCenter(0, 0, 0).strength(0.04)).force("collide", forceCollide((d) => {
      const node = d;
      const visualNode = visualNodes[index.get(node.id)];
      return knowledgeGraphRenderedNodeRadialExtent(
        node.r,
        visualNode.nodeGlyph,
        true
      ) + 3;
    }).iterations(2)).alpha(plan.warmStart ? 0.5 : 1).alphaDecay(0.018).velocityDecay(0.42).stop();
    if (reducedMotion) {
      const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
      for (let i = 0; i < budget && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; i++) sim.tick();
      sim.alpha(0);
    }
    const runtime = {
      graphKey,
      reducedMotion,
      sim,
      nodes: simNodes,
      cacheBuffers: plan.cacheBuffers,
      nextCacheBufferIndex: 0
    };
    layoutRuntimeRef.current = runtime;
    layoutTickAccumulatorRef.current = 0;
    geometryDirtyRef.current = true;
    invalidate();
    return () => {
      sim.stop();
      if (layoutRuntimeRef.current === runtime) layoutRuntimeRef.current = null;
    };
  }, [
    graphKey,
    layoutNodes,
    simLinks,
    visualNodes,
    index,
    reducedMotion,
    invalidate
  ]);
  useLayoutEffect(() => {
    beginKnowledgeGraphRuntimeTransition(
      readyGraphKeyRef,
      geometryDirtyRef,
      sceneGroupRef.current,
      invalidate,
      () => {
        if (hoverIdRef.current === null) return;
        hoverIdRef.current = null;
        onHoverRef.current(null);
      }
    );
  }, [graphKey, reducedMotion, invalidate]);
  const applyEmphasis = useCallback(() => {
    const mesh = meshRef.current;
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    if (mesh) {
      visualNodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(
          n.color,
          knowledgeGraphNodeEmphasisDimAmount(
            n.id,
            focus,
            focusSet,
            queryActive,
            queryMatchIds
          ),
          themeMode
        ));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    updateKnowledgeGraphGlyphColors(
      sphereGlyphsRef.current,
      glyphNodeIndexes.sphere,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    updateKnowledgeGraphGlyphColors(
      boxGlyphsRef.current,
      glyphNodeIndexes.box,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    updateKnowledgeGraphGlyphColors(
      diamondGlyphsRef.current,
      glyphNodeIndexes.diamond,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    let k = 0;
    for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
      const e = validEdges[edgeIndex];
      const incident = focus ? e.source === focus || e.target === focus : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
      const c = dim(
        edgeDisplayColors[edgeIndex],
        focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
        themeMode
      );
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (!knowledgeGraphEdgeStrokeSegmentVisible(
          e.edgeStrokePattern ?? "solid",
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS
        )) continue;
        lineCol[k] = c.r;
        lineCol[k + 1] = c.g;
        lineCol[k + 2] = c.b;
        lineCol[k + 3] = c.r;
        lineCol[k + 4] = c.g;
        lineCol[k + 5] = c.b;
        k += 6;
      }
    }
    const geom = linesRef.current?.geometry;
    const attr = geom?.getAttribute("color");
    if (attr) attr.needsUpdate = true;
    const arrows = arrowsRef.current;
    if (arrows) {
      directedEdges.forEach(({ edge }, arrowIndex) => {
        const incident = focus ? edge.source === focus || edge.target === focus : graphEdgeMatchesQuery(
          edge.source,
          edge.target,
          queryMatchIds,
          normalizedQuery
        );
        arrows.setColorAt(
          arrowIndex,
          dim(
            edgeDisplayColors[directedEdges[arrowIndex].edgeIndex],
            focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
            themeMode
          )
        );
      });
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
    }
  }, [
    visualNodes,
    glyphNodeIndexes,
    resolvedGlyphColor,
    validEdges,
    directedEdges,
    index,
    neighbors,
    hoverId,
    selectedId,
    queryActive,
    queryMatchIds,
    normalizedQuery,
    lineCol,
    edgeDisplayColors,
    themeMode
  ]);
  useLayoutEffect(() => {
    applyEmphasis();
    geometryDirtyRef.current = true;
    invalidate();
  }, [applyEmphasis, invalidate]);
  useEffect4(() => {
    flyToIdRef.current = flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
    if (flyToIdRef.current) {
      autoFrameStageRef.current = 2;
      invalidate();
    }
  }, [graphIdentity, selectedId, index, flyToSelection, invalidate]);
  useFrame((_, delta) => {
    const runtime = layoutRuntimeRef.current;
    const mesh = meshRef.current;
    const controls = controlsRef?.current ?? null;
    synchronizeKnowledgeGraphControlsListener(
      attachedControlsRef,
      controls,
      onUserGrab
    );
    if (!runtime || runtime.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion || !mesh) return;
    const sim = runtime.sim;
    const simNodes = runtime.nodes;
    let positionsChanged = geometryDirtyRef.current;
    if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA) {
      const advanced = advanceGraphLayoutClockInto(
        layoutTickAccumulatorRef.current,
        delta,
        _layoutClockResult
      );
      layoutTickAccumulatorRef.current = advanced.remainderSeconds;
      for (let tick = 0; tick < advanced.ticks && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; tick++) {
        sim.tick();
        positionsChanged = true;
      }
    } else {
      layoutTickAccumulatorRef.current = 0;
    }
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    const completedCacheBufferIndex = runtime.nextCacheBufferIndex;
    if (positionsChanged) {
      geometryDirtyRef.current = true;
      const sceneGroup = sceneGroupRef.current;
      if (sceneGroup) sceneGroup.visible = false;
      const positionSlots = runtime.cacheBuffers[completedCacheBufferIndex].positionSlots;
      _dummy.quaternion.identity();
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const z = n.z ?? 0;
        const remembered = positionSlots[i];
        remembered[0] = x;
        remembered[1] = y;
        remembered[2] = z;
        _dummy.position.set(x, y, z);
        const pop = knowledgeGraphRenderedNodeScale(
          focus !== null && (n.id === focus || focusSet?.has(n.id) === true)
        );
        _dummy.scale.setScalar(n.r * pop);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
      updateKnowledgeGraphGlyphMatrices(
        sphereGlyphsRef.current,
        glyphNodeIndexes.sphere,
        simNodes,
        focus,
        focusSet
      );
      updateKnowledgeGraphGlyphMatrices(
        boxGlyphsRef.current,
        glyphNodeIndexes.box,
        simNodes,
        focus,
        focusSet
      );
      updateKnowledgeGraphGlyphMatrices(
        diamondGlyphsRef.current,
        glyphNodeIndexes.diamond,
        simNodes,
        focus,
        focusSet
      );
      let k = 0;
      for (let edgeIndex = 0; edgeIndex < edgeLanes.length; edgeIndex++) {
        const lane = edgeLanes[edgeIndex];
        const e = lane.edge;
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        setEdgeCurve(s, t, lane);
        _curvePoint.copy(_a);
        for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
          graphEdgeCurvePointInto(
            _a,
            _curveControl,
            _b,
            (chord + 1) / GRAPH_EDGE_CURVE_SEGMENTS,
            _curveNext
          );
          const chordVisible = knowledgeGraphEdgeStrokeSegmentVisible(
            e.edgeStrokePattern ?? "solid",
            chord,
            GRAPH_EDGE_CURVE_SEGMENTS
          );
          if (chordVisible) {
            linePos[k] = _curvePoint.x;
            linePos[k + 1] = _curvePoint.y;
            linePos[k + 2] = _curvePoint.z;
            linePos[k + 3] = _curveNext.x;
            linePos[k + 4] = _curveNext.y;
            linePos[k + 5] = _curveNext.z;
            k += 6;
          }
          _curvePoint.copy(_curveNext);
        }
      }
      const posAttr = linesRef.current?.geometry.getAttribute("position");
      if (posAttr) posAttr.needsUpdate = true;
      const arrows = arrowsRef.current;
      if (arrows) {
        for (let i = 0; i < directedEdges.length; i++) {
          const lane = directedEdges[i];
          const edge = lane.edge;
          const source = simNodes[index.get(edge.source)];
          const targetIndex = index.get(edge.target);
          const target = simNodes[targetIndex];
          setEdgeCurve(source, target, lane);
          const targetExtent = knowledgeGraphRenderedNodeRadialExtent(
            target.r,
            visualNodes[targetIndex].nodeGlyph,
            focus !== null && (target.id === focus || focusSet?.has(target.id) === true)
          );
          if (!graphEdgeTargetBoundaryInto(
            _a,
            _curveControl,
            _b,
            targetExtent,
            _curveNext,
            _direction
          )) {
            _dummy.position.copy(_b);
            _dummy.quaternion.identity();
            _dummy.scale.setScalar(0);
          } else {
            _dummy.position.copy(_curveNext).addScaledVector(
              _direction,
              -KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2
            );
            _dummy.quaternion.setFromUnitVectors(_up, _direction);
            _dummy.scale.set(
              1.25,
              KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
              1.25
            );
          }
          _dummy.updateMatrix();
          arrows.setMatrixAt(i, _dummy.matrix);
        }
        arrows.instanceMatrix.needsUpdate = true;
        arrows.boundingSphere = null;
      }
    }
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0 && (positionsChanged || !reducedMotion)) {
      _dummy.quaternion.identity();
      if (!reducedMotion) {
        flowPhaseRef.current = advanceKnowledgeGraphFlowPhase(
          flowPhaseRef.current,
          delta
        );
      }
      const base = reducedMotion ? 0 : flowPhaseRef.current;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const lane = flowEdges[fe];
        const e = lane.edge;
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        setEdgeCurve(s, t, lane);
        const queryIncident = graphEdgeMatchesQuery(
          e.source,
          e.target,
          queryMatchIds,
          normalizedQuery
        );
        let size = 1.3;
        if (focus) {
          if (e.source !== focus && e.target !== focus) size = 0;
        } else if (!queryIncident) {
          size = 0;
        }
        const phase = fe * 0.618034;
        const edgeParticleCount = particleDistribution.basePerEdge + (fe < particleDistribution.extraEdgeCount ? 1 : 0);
        for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
          const frac = reducedMotion ? reducedMotionFlowParticleFraction(q, edgeParticleCount) : (base + phase + q / edgeParticleCount) % 1;
          graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }
    const label = labelSpriteRef.current;
    if (label) {
      const fi = focus != null ? index.get(focus) : void 0;
      if (fi != null) {
        const n = simNodes[fi];
        label.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        label.center.set(
          0.5,
          knowledgeGraphFocusLabelSpriteCenterY(
            n.r,
            visualNodes[fi].nodeGlyph
          )
        );
        label.visible = true;
      } else {
        label.visible = false;
      }
    }
    const layoutSettled = sim.alpha() <= GRAPH_LAYOUT_SETTLED_ALPHA;
    if (autoFrame && autoFrameStageRef.current < 2 && (autoFrameStageRef.current === 0 || layoutSettled) && simNodes.length > 0 && cameraProjectionKind !== null) {
      const cameraParentIdentity = isKnowledgeGraphCameraParentChainIdentity(
        camera.parent
      );
      const cameraSelfTransformCanonical = isKnowledgeGraphCameraSelfTransformCanonical(camera);
      const cameraMethodsCanonical = camera.getWorldDirection === THREE2.Camera.prototype.getWorldDirection && camera.lookAt === THREE2.Object3D.prototype.lookAt && camera.updateMatrixWorld === THREE2.Camera.prototype.updateMatrixWorld && camera.updateWorldMatrix === THREE2.Camera.prototype.updateWorldMatrix;
      let centeredProjectionSupported = false;
      if (cameraProjectionKind === "perspective") {
        _perspectiveAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
        _perspectiveAutoFrameProjection.viewEnabled = perspectiveCamera.view?.enabled === true;
        _perspectiveAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _perspectiveAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
        _perspectiveAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _perspectiveAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE2.PerspectiveCamera.prototype.updateProjectionMatrix;
        _perspectiveAutoFrameProjection.effectiveFovMethodCanonical = perspectiveCamera.getEffectiveFOV === THREE2.PerspectiveCamera.prototype.getEffectiveFOV;
        _perspectiveAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE2.WebGLCoordinateSystem;
        _perspectiveAutoFrameProjection.fovDegrees = perspectiveCamera.fov;
        _perspectiveAutoFrameProjection.aspect = perspectiveCamera.aspect;
        _perspectiveAutoFrameProjection.zoom = perspectiveCamera.zoom;
        _perspectiveAutoFrameProjection.near = perspectiveCamera.near;
        _perspectiveAutoFrameProjection.far = perspectiveCamera.far;
        _perspectiveAutoFrameProjection.filmOffset = perspectiveCamera.filmOffset;
        _perspectiveAutoFrameProjection.projectionMatrixElements = perspectiveCamera.projectionMatrix.elements;
        centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(
          _perspectiveAutoFrameProjection
        );
      } else {
        _orthographicAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
        _orthographicAutoFrameProjection.viewEnabled = orthographicCamera.view?.enabled === true;
        _orthographicAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _orthographicAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
        _orthographicAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _orthographicAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE2.OrthographicCamera.prototype.updateProjectionMatrix;
        _orthographicAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE2.WebGLCoordinateSystem;
        _orthographicAutoFrameProjection.left = orthographicCamera.left;
        _orthographicAutoFrameProjection.right = orthographicCamera.right;
        _orthographicAutoFrameProjection.top = orthographicCamera.top;
        _orthographicAutoFrameProjection.bottom = orthographicCamera.bottom;
        _orthographicAutoFrameProjection.zoom = orthographicCamera.zoom;
        _orthographicAutoFrameProjection.near = orthographicCamera.near;
        _orthographicAutoFrameProjection.far = orthographicCamera.far;
        _orthographicAutoFrameProjection.projectionMatrixElements = orthographicCamera.projectionMatrix.elements;
        centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(
          _orthographicAutoFrameProjection
        );
      }
      const perspectiveFov = centeredProjectionSupported && cameraProjectionKind === "perspective" ? perspectiveCamera.getEffectiveFOV() : 0;
      const horizontalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.right - orthographicCamera.left) : 0;
      const verticalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.top - orthographicCamera.bottom) : 0;
      const projectionReady = centeredProjectionSupported && (cameraProjectionKind === "perspective" ? isKnowledgeGraphPerspectiveProjectionReady(
        perspectiveFov,
        perspectiveCamera.aspect
      ) : isKnowledgeGraphOrthographicProjectionReady(
        horizontalSpan,
        verticalSpan,
        orthographicCamera.zoom
      ));
      const cameraPositionReady = isKnowledgeGraphCameraVectorFinite(
        camera.position.x,
        camera.position.y,
        camera.position.z
      );
      const controlsTargetReady = controls === null || isKnowledgeGraphCameraVectorFinite(
        controls.target.x,
        controls.target.y,
        controls.target.z
      );
      if (projectionReady && cameraPositionReady && controlsTargetReady) {
        _box.makeEmpty();
        for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
          const n = simNodes[nodeIndex];
          const glyph = visualNodes[nodeIndex].nodeGlyph;
          const radius = knowledgeGraphAutoFrameNodeRadialExtent(
            n.r,
            glyph,
            visualNodes[nodeIndex].id === focus
          );
          _box.expandByPoint(_a.set(
            (n.x ?? 0) - radius,
            (n.y ?? 0) - radius,
            (n.z ?? 0) - radius
          ));
          _box.expandByPoint(_b.set(
            (n.x ?? 0) + radius,
            (n.y ?? 0) + radius,
            (n.z ?? 0) + radius
          ));
        }
        if (validEdges.length > 0) {
          _box.expandByScalar(
            MAX_GRAPH_EDGE_LANE_OFFSET + GRAPH_DIRECTION_MARKER_PADDING
          );
        }
        const sphere = _box.getBoundingSphere(_sphere);
        const currentDistance = controls ? camera.position.distanceTo(controls.target) : camera.position.distanceTo(sphere.center);
        if (controls && camera.position.distanceToSquared(controls.target) > 1e-12) {
          _direction.copy(camera.position).sub(controls.target).normalize();
        } else {
          camera.getWorldDirection(_direction).multiplyScalar(-1);
        }
        const directionReady = isKnowledgeGraphCameraVectorFinite(
          _direction.x,
          _direction.y,
          _direction.z
        );
        if (directionReady) {
          if (_direction.lengthSq() <= 1e-12) _direction.set(0, 0, 1);
          else _direction.normalize();
          const fit = cameraProjectionKind === "orthographic" ? planKnowledgeGraphOrthographicCameraFitInto(
            sphere.radius,
            currentDistance,
            horizontalSpan,
            verticalSpan,
            orthographicCamera.zoom,
            _cameraFitResult
          ) : planKnowledgeGraphPerspectiveCameraFitInto(
            sphere.radius,
            currentDistance,
            perspectiveFov,
            perspectiveCamera.aspect,
            _cameraFitResult
          );
          camera.position.copy(sphere.center).addScaledVector(_direction, fit.distance);
          if (cameraProjectionKind === "orthographic" && fit.orthographicZoom !== void 0) {
            orthographicCamera.zoom = fit.orthographicZoom;
          }
          const projected = camera;
          const clipping = planKnowledgeGraphCameraClippingInto(
            cameraProjectionKind,
            projected.near,
            projected.far,
            fit.distance,
            sphere.radius,
            _cameraClippingResult
          );
          projected.near = clipping.near;
          projected.far = clipping.far;
          projected.updateProjectionMatrix();
          if (controls) {
            controls.target.copy(sphere.center);
            controls.update();
          } else {
            camera.lookAt(sphere.center);
            camera.updateMatrixWorld();
          }
          autoFrameStageRef.current = layoutSettled ? 2 : 1;
        }
      }
    }
    if (flyToIdRef.current) {
      const fi = index.get(flyToIdRef.current);
      if (fi == null) {
        flyToIdRef.current = null;
      } else if (controls) {
        const n = simNodes[fi];
        _a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        controls.target.lerp(_a, graphCameraTargetDamping(delta, reducedMotion));
        controls.update();
        if (controls.target.distanceTo(_a) < 0.5) flyToIdRef.current = null;
      } else {
        flyToIdRef.current = null;
      }
    }
    if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA || !reducedMotion && particleCount > 0 || flyToIdRef.current !== null) {
      invalidate();
    }
    if (positionsChanged) {
      publishGraphLayoutCache(posMap, runtime, completedCacheBufferIndex);
      geometryDirtyRef.current = false;
      readyGraphKeyRef.current = graphKey;
      const group = sceneGroupRef.current;
      if (group) group.visible = true;
    }
  });
  const focusLabelId = hoverId ?? selectedId;
  const focusLabelIndex = focusLabelId != null && index.has(focusLabelId) ? index.get(focusLabelId) : void 0;
  const focusLabel = focusLabelIndex == null ? "" : visualNodes[focusLabelIndex]?.label ?? "";
  const handleMove = useCallback(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion) return;
      if (!isKnowledgeGraphInstanceId(e.instanceId, visualNodes.length)) return;
      e.stopPropagation();
      const id = visualNodes[e.instanceId].id;
      if (id !== hoverIdRef.current) {
        hoverIdRef.current = id;
        onHoverRef.current(id);
      }
    },
    [graphKey, reducedMotion, visualNodes]
  );
  const handleOut = useCallback(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion);
      handleKnowledgeGraphPointerOut(
        ready,
        () => e.stopPropagation(),
        () => {
          if (hoverIdRef.current === null) return;
          hoverIdRef.current = null;
          onHoverRef.current(null);
        }
      );
    },
    [graphKey, reducedMotion]
  );
  const handleClick = useCallback(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion);
      handleKnowledgeGraphNodeClick(
        ready,
        e.instanceId,
        visualNodes.length,
        e.delta,
        () => e.stopPropagation(),
        (instanceId) => {
          const id = visualNodes[instanceId].id;
          onSelect(toggledKnowledgeGraphSelection(selectedId, id));
        }
      );
    },
    [graphKey, reducedMotion, visualNodes, onSelect, selectedId]
  );
  return /* @__PURE__ */ jsx4(Fragment4, { children: /* @__PURE__ */ jsxs4("group", { ref: sceneGroupRef, visible: false, children: [
    nodes.length > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, nodes.length],
        frustumCulled: false,
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ jsx4("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ jsx4("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ) : null,
    glyphNodeIndexes.sphere.length > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: sphereGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.sphere.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ jsx4("sphereGeometry", { args: [
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline,
            12,
            12
          ] }),
          /* @__PURE__ */ jsx4(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    glyphNodeIndexes.box.length > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: boxGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.box.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ jsx4("boxGeometry", { args: [
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            1,
            1,
            1
          ] }),
          /* @__PURE__ */ jsx4(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    glyphNodeIndexes.diamond.length > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: diamondGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.diamond.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ jsx4("octahedronGeometry", { args: [
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell,
            0
          ] }),
          /* @__PURE__ */ jsx4(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    /* @__PURE__ */ jsxs4("lineSegments", { ref: linesRef, frustumCulled: false, children: [
      /* @__PURE__ */ jsxs4("bufferGeometry", { children: [
        /* @__PURE__ */ jsx4("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ jsx4("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ jsx4(
        "lineBasicMaterial",
        {
          vertexColors: true,
          toneMapped: false,
          depthWrite: false,
          blending: THREE2.NormalBlending
        }
      )
    ] }, `lines-${validEdges.length}`),
    directedEdges.length > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: arrowsRef,
        args: [void 0, void 0, directedEdges.length],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ jsx4("coneGeometry", { args: [1, 1, 8] }),
          /* @__PURE__ */ jsx4("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `arrows-${directedEdges.length}`
    ) : null,
    particleCount > 0 ? /* @__PURE__ */ jsxs4(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ jsx4("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ jsx4(
            "meshBasicMaterial",
            {
              color: resolvedParticleColor,
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: themeMode === "light" ? THREE2.NormalBlending : THREE2.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ jsx4(
      FocusLabelSprite,
      {
        spriteRef: labelSpriteRef,
        text: focusLabel,
        color: resolvedLabelColor,
        themeMode,
        invalidate
      }
    )
  ] }, `graph-${graphKey}`) });
}

// react/knowledgeGraphPublic.ts
import {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1 as KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V12,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1 as PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V12,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1 as PREPARED_KNOWLEDGE_GRAPH_VIEW_V12,
  KnowledgeGraphPresentationJsonError as KnowledgeGraphPresentationJsonError2,
  assertPreparedGenericKnowledgeGraphPresentation as assertPreparedGenericKnowledgeGraphPresentation4,
  assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation5,
  assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView5,
  isPreparedKnowledgeGraphPresentation as isPreparedKnowledgeGraphPresentation2,
  isPreparedKnowledgeGraphView as isPreparedKnowledgeGraphView2,
  knowledgeGraphPresentationContainsNode as knowledgeGraphPresentationContainsNode3,
  knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode5,
  parseKnowledgeGraphPresentationJson as parseKnowledgeGraphPresentationJson2,
  prepareKnowledgeGraphPresentation as prepareKnowledgeGraphPresentation2,
  prepareKnowledgeGraphView as prepareKnowledgeGraphView3,
  serializePreparedKnowledgeGraphPresentation as serializePreparedKnowledgeGraphPresentation2
} from "#cortexel-knowledge-graph-presentation-capability";
export {
  CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  GRAPH_LAYOUT_TICK_SECONDS,
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V12 as KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  KnowledgeGraphAccessibleFigure,
  KnowledgeGraphLegend,
  KnowledgeGraphPresentationJsonError2 as KnowledgeGraphPresentationJsonError,
  KnowledgeGraphStaticRecordView,
  MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V12 as PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V12 as PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphIdentity,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget,
  assertPreparedGenericKnowledgeGraphPresentation4 as assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation5 as assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView5 as assertPreparedKnowledgeGraphView,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  assignGraphEdgeLanes,
  buildAdjacency,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphCameraTargetDamping,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto,
  graphQueryMatchIds,
  graphSignature,
  isKnowledgeGraphLiveForceWithinBudget,
  isPreparedKnowledgeGraphPresentation2 as isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView2 as isPreparedKnowledgeGraphView,
  knowledgeGraphLiveForceAvailability,
  knowledgeGraphPresentationContainsNode3 as knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode5 as knowledgeGraphViewContainsNode,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  parseKnowledgeGraphPresentationJson2 as parseKnowledgeGraphPresentationJson,
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  prepareKnowledgeGraphPresentation2 as prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView3 as prepareKnowledgeGraphView,
  reducedMotionLayoutTickBudget,
  serializePreparedKnowledgeGraphPresentation2 as serializePreparedKnowledgeGraphPresentation,
  uniqueGraphTopologyLinks
};
//# sourceMappingURL=knowledge-graph.js.map