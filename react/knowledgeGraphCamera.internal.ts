export const KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN = 1.12;
export const KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE = 120;
export const KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN = 1.25;
export const KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR = 0.001;

export type KnowledgeGraphCameraProjectionV1 =
  | Readonly<{
      readonly kind: 'perspective';
      readonly verticalFovDegrees: number;
      readonly aspect: number;
    }>
  | Readonly<{
      readonly kind: 'orthographic';
      readonly horizontalSpan: number;
      readonly verticalSpan: number;
      readonly currentZoom: number;
    }>;

export interface KnowledgeGraphCameraFitInputV1 {
  readonly contentRadius: number;
  readonly currentDistance: number;
  readonly projection: KnowledgeGraphCameraProjectionV1;
}

export interface KnowledgeGraphCameraFitPlanV1 {
  readonly distance: number;
  /** Present only for an orthographic camera. */
  readonly orthographicZoom?: number;
}

export interface MutableKnowledgeGraphCameraFitPlanV1 {
  distance: number;
  orthographicZoom: number | undefined;
}

export interface KnowledgeGraphCameraClippingPlanV1 {
  readonly near: number;
  readonly far: number;
}

export interface MutableKnowledgeGraphCameraClippingPlanV1 {
  near: number;
  far: number;
}

export interface KnowledgeGraphCameraProjectionFlagsV1 {
  readonly isPerspectiveCamera?: boolean;
  readonly isOrthographicCamera?: boolean;
}

export interface KnowledgeGraphTransformNodeV1 {
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly quaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
  readonly scale: Readonly<{ x: number; y: number; z: number }>;
  readonly matrix: Readonly<{ elements: ArrayLike<number> }>;
  readonly matrixWorld: Readonly<{ elements: ArrayLike<number> }>;
  readonly parent: KnowledgeGraphTransformNodeV1 | null;
}

export interface KnowledgeGraphCameraSelfTransformV1 {
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly quaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
  readonly scale: Readonly<{ x: number; y: number; z: number }>;
  readonly matrixAutoUpdate: boolean;
  readonly matrix: Readonly<{ elements: ArrayLike<number> }>;
  readonly matrixWorld: Readonly<{ elements: ArrayLike<number> }>;
}

export type KnowledgeGraphCenteredAutoFrameProjectionV1 =
  | Readonly<{
      readonly kind: 'perspective';
      readonly isArrayCamera: boolean;
      readonly viewEnabled: boolean;
      readonly parentTransformIdentity: boolean;
      readonly selfTransformCanonical: boolean;
      readonly cameraMethodsCanonical: boolean;
      readonly projectionMethodCanonical: boolean;
      readonly effectiveFovMethodCanonical: boolean;
      readonly webGlCoordinateSystem: boolean;
      readonly fovDegrees: number;
      readonly aspect: number;
      readonly zoom: number;
      readonly near: number;
      readonly far: number;
      readonly filmOffset: number;
      readonly projectionMatrixElements: ArrayLike<number>;
    }>
  | Readonly<{
      readonly kind: 'orthographic';
      readonly isArrayCamera: boolean;
      readonly viewEnabled: boolean;
      readonly parentTransformIdentity: boolean;
      readonly selfTransformCanonical: boolean;
      readonly cameraMethodsCanonical: boolean;
      readonly projectionMethodCanonical: boolean;
      readonly webGlCoordinateSystem: boolean;
      readonly left: number;
      readonly right: number;
      readonly top: number;
      readonly bottom: number;
      readonly zoom: number;
      readonly near: number;
      readonly far: number;
      readonly projectionMatrixElements: ArrayLike<number>;
    }>;

const IDENTITY_MATRIX_ELEMENTS = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function finiteEqual(observed: number, expected: number): boolean {
  if (!Number.isFinite(observed) || !Number.isFinite(expected)) return false;
  const scale = Math.max(1, Math.abs(observed), Math.abs(expected));
  return Math.abs(observed - expected) <= Number.EPSILON * 64 * scale;
}

export function isKnowledgeGraphIdentityMatrixElements(
  elements: ArrayLike<number>,
): boolean {
  if (elements.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(elements[index], IDENTITY_MATRIX_ELEMENTS[index])) return false;
  }
  return true;
}

export function areKnowledgeGraphMatrixElementsEqual(
  first: ArrayLike<number>,
  second: ArrayLike<number>,
): boolean {
  if (first.length !== 16 || second.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(first[index], second[index])) return false;
  }
  return true;
}

/**
 * Prove that a unit-scale camera's local/world matrices are the ordinary
 * composition of its finite position and normalized quaternion. Identity
 * ancestors then keep fitting and canonical camera methods in one world-space
 * coordinate system. This check allocates nothing.
 */
export function isKnowledgeGraphCameraSelfTransformCanonical(
  input: KnowledgeGraphCameraSelfTransformV1,
): boolean {
  const { position, quaternion, scale } = input;
  if (
    !input.matrixAutoUpdate ||
    !isKnowledgeGraphCameraVectorFinite(position.x, position.y, position.z) ||
    !isKnowledgeGraphCameraVectorFinite(scale.x, scale.y, scale.z) ||
    scale.x !== 1 || scale.y !== 1 || scale.z !== 1 ||
    !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) ||
    !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w) ||
    input.matrix.elements.length !== 16 || input.matrixWorld.elements.length !== 16
  ) return false;
  const norm = quaternion.x * quaternion.x + quaternion.y * quaternion.y +
    quaternion.z * quaternion.z + quaternion.w * quaternion.w;
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
  if (!(
    finiteEqual(matrix[0], 1 - (yy + zz)) &&
    finiteEqual(matrix[1], xy + wz) &&
    finiteEqual(matrix[2], xz - wy) && finiteEqual(matrix[3], 0) &&
    finiteEqual(matrix[4], xy - wz) &&
    finiteEqual(matrix[5], 1 - (xx + zz)) &&
    finiteEqual(matrix[6], yz + wx) && finiteEqual(matrix[7], 0) &&
    finiteEqual(matrix[8], xz + wy) &&
    finiteEqual(matrix[9], yz - wx) &&
    finiteEqual(matrix[10], 1 - (xx + yy)) && finiteEqual(matrix[11], 0) &&
    finiteEqual(matrix[12], position.x) &&
    finiteEqual(matrix[13], position.y) &&
    finiteEqual(matrix[14], position.z) && finiteEqual(matrix[15], 1)
  )) return false;
  return areKnowledgeGraphMatrixElementsEqual(matrix, input.matrixWorld.elements);
}

/** Reject any transformed camera ancestor; fitting is computed in graph world space. */
export function isKnowledgeGraphCameraParentChainIdentity(
  parent: KnowledgeGraphTransformNodeV1 | null,
): boolean {
  let cursor = parent;
  let depth = 0;
  while (cursor !== null) {
    depth++;
    if (depth > 64) return false;
    if (
      cursor.position.x !== 0 || cursor.position.y !== 0 || cursor.position.z !== 0 ||
      cursor.quaternion.x !== 0 || cursor.quaternion.y !== 0 ||
      cursor.quaternion.z !== 0 || cursor.quaternion.w !== 1 ||
      cursor.scale.x !== 1 || cursor.scale.y !== 1 || cursor.scale.z !== 1 ||
      !isKnowledgeGraphIdentityMatrixElements(cursor.matrix.elements) ||
      !isKnowledgeGraphIdentityMatrixElements(cursor.matrixWorld.elements)
    ) return false;
    cursor = cursor.parent;
  }
  return true;
}

function canonicalPerspectiveProjection(
  input: Extract<
    KnowledgeGraphCenteredAutoFrameProjectionV1,
    { readonly kind: 'perspective' }
  >,
): boolean {
  if (
    !Number.isFinite(input.fovDegrees) || input.fovDegrees <= 0 ||
    input.fovDegrees >= 180 || !Number.isFinite(input.aspect) || input.aspect <= 0 ||
    !Number.isFinite(input.zoom) || input.zoom <= 0 ||
    !Number.isFinite(input.near) || input.near <= 0 ||
    !Number.isFinite(input.far) || input.far <= input.near ||
    !Number.isFinite(input.filmOffset) || input.filmOffset !== 0 ||
    input.projectionMatrixElements.length !== 16
  ) return false;
  const halfFov = input.fovDegrees * Math.PI / 360;
  const y = input.zoom / Math.tan(halfFov);
  const x = y / input.aspect;
  const c = -(input.far + input.near) / (input.far - input.near);
  const d = -2 * input.far * input.near / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) &&
    finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) &&
    finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) &&
    finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) &&
    finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) &&
    finiteEqual(matrix[10], c) && finiteEqual(matrix[11], -1) &&
    finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) &&
    finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 0);
}

function canonicalOrthographicProjection(
  input: Extract<
    KnowledgeGraphCenteredAutoFrameProjectionV1,
    { readonly kind: 'orthographic' }
  >,
): boolean {
  if (
    !Number.isFinite(input.left) || !Number.isFinite(input.right) ||
    !Number.isFinite(input.top) || !Number.isFinite(input.bottom) ||
    input.right <= input.left || input.top <= input.bottom ||
    !finiteEqual(input.left, -input.right) ||
    !finiteEqual(input.bottom, -input.top) ||
    !Number.isFinite(input.zoom) || input.zoom <= 0 ||
    !Number.isFinite(input.near) || input.near < 0 ||
    !Number.isFinite(input.far) || input.far <= input.near ||
    input.projectionMatrixElements.length !== 16
  ) return false;
  const x = 2 * input.zoom / (input.right - input.left);
  const y = 2 * input.zoom / (input.top - input.bottom);
  const c = -2 / (input.far - input.near);
  const d = -(input.far + input.near) / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) &&
    finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) &&
    finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) &&
    finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) &&
    finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) &&
    finiteEqual(matrix[10], c) && finiteEqual(matrix[11], 0) &&
    finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) &&
    finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 1);
}

/** Accept only ordinary centered Three projections whose matrix matches fields. */
export function isKnowledgeGraphCenteredAutoFrameProjectionSupported(
  input: KnowledgeGraphCenteredAutoFrameProjectionV1,
): boolean {
  if (
    input.isArrayCamera || input.viewEnabled || !input.parentTransformIdentity ||
    !input.selfTransformCanonical || !input.cameraMethodsCanonical ||
    !input.projectionMethodCanonical || !input.webGlCoordinateSystem
  ) return false;
  if (input.kind === 'perspective') {
    return input.effectiveFovMethodCanonical && canonicalPerspectiveProjection(input);
  }
  return canonicalOrthographicProjection(input);
}

export function isKnowledgeGraphPerspectiveProjectionReady(
  effectiveFovDegrees: number,
  aspect: number,
): boolean {
  return Number.isFinite(effectiveFovDegrees) &&
    effectiveFovDegrees > 0 &&
    effectiveFovDegrees < 180 &&
    Number.isFinite(aspect) &&
    aspect > 0;
}

export function isKnowledgeGraphOrthographicProjectionReady(
  horizontalSpan: number,
  verticalSpan: number,
  zoom: number,
): boolean {
  return Number.isFinite(horizontalSpan) && horizontalSpan > 0 &&
    Number.isFinite(verticalSpan) && verticalSpan > 0 &&
    Number.isFinite(zoom) && zoom > 0;
}

export function isKnowledgeGraphCameraVectorFinite(
  x: number,
  y: number,
  z: number,
): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

/** Accept only projections whose fit and clipping semantics Cortexel implements. */
export function knowledgeGraphCameraProjectionKind(
  camera: KnowledgeGraphCameraProjectionFlagsV1,
): 'perspective' | 'orthographic' | null {
  const perspective = camera.isPerspectiveCamera === true;
  const orthographic = camera.isOrthographicCamera === true;
  if (perspective === orthographic) return null;
  if (perspective) return 'perspective';
  if (orthographic) return 'orthographic';
  return null;
}

/** Allocation-free form for the R3F frame callback. */
export function planKnowledgeGraphCameraClippingInto(
  kind: 'perspective' | 'orthographic',
  currentNearValue: number,
  currentFarValue: number,
  distanceValue: number,
  contentRadiusValue: number,
  target: MutableKnowledgeGraphCameraClippingPlanV1,
): MutableKnowledgeGraphCameraClippingPlanV1 {
  const radius = positiveFinite(contentRadiusValue, 1);
  const distance = positiveFinite(
    distanceValue,
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
  );
  const minimumNear = kind === 'perspective'
    ? KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR
    : 0;
  const maximumNear = Math.max(
    minimumNear,
    distance - radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
  );
  const fallbackNear = kind === 'perspective'
    ? Math.min(0.1, maximumNear)
    : 0;
  const currentNear = Number.isFinite(currentNearValue) &&
      currentNearValue >= minimumNear
    ? currentNearValue
    : fallbackNear;
  const near = Math.min(currentNear, maximumNear);
  const requiredFar = Math.max(
    near + KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR,
    distance + radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
  );
  const currentFar = Number.isFinite(currentFarValue) && currentFarValue > near
    ? currentFarValue
    : requiredFar;
  target.near = near;
  target.far = Math.max(currentFar, requiredFar);
  return target;
}

/** Keep the complete fitted sphere between finite host-camera clipping planes. */
export function planKnowledgeGraphCameraClipping(input: {
  readonly kind: 'perspective' | 'orthographic';
  readonly currentNear: number;
  readonly currentFar: number;
  readonly distance: number;
  readonly contentRadius: number;
}): KnowledgeGraphCameraClippingPlanV1 {
  const target = planKnowledgeGraphCameraClippingInto(
    input.kind,
    input.currentNear,
    input.currentFar,
    input.distance,
    input.contentRadius,
    { near: 0, far: 0 },
  );
  return Object.freeze({
    near: target.near,
    far: target.far,
  });
}

function positiveFinite(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Projection-aware, orientation-independent sphere fit. The caller owns the
 * camera direction and target; this planner only chooses distance/zoom. A sphere
 * avoids silently fitting one axis while rotated depth clips on another.
 */
export function planKnowledgeGraphCameraFit(
  input: KnowledgeGraphCameraFitInputV1,
): KnowledgeGraphCameraFitPlanV1 {
  const target: MutableKnowledgeGraphCameraFitPlanV1 = {
    distance: 0,
    orthographicZoom: undefined,
  };
  if (input.projection.kind === 'perspective') {
    planKnowledgeGraphPerspectiveCameraFitInto(
      input.contentRadius,
      input.currentDistance,
      input.projection.verticalFovDegrees,
      input.projection.aspect,
      target,
    );
  } else {
    planKnowledgeGraphOrthographicCameraFitInto(
      input.contentRadius,
      input.currentDistance,
      input.projection.horizontalSpan,
      input.projection.verticalSpan,
      input.projection.currentZoom,
      target,
    );
  }
  return Object.freeze(target.orthographicZoom === undefined
    ? { distance: target.distance }
    : { distance: target.distance, orthographicZoom: target.orthographicZoom });
}

export function planKnowledgeGraphPerspectiveCameraFitInto(
  contentRadius: number,
  currentCameraDistance: number,
  verticalFovDegrees: number,
  aspectRatio: number,
  target: MutableKnowledgeGraphCameraFitPlanV1,
): MutableKnowledgeGraphCameraFitPlanV1 {
  const radius = positiveFinite(contentRadius, 1);
  // Validate the caller-owned observation even though a true one-shot fit does
  // not preserve a prior zoom-out. `autoFrame: false` is the retain-camera path.
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const verticalFov = positiveFinite(verticalFovDegrees, 50);
  const aspect = positiveFinite(aspectRatio, 1);
  const verticalHalf = Math.min(89.5, Math.max(0.5, verticalFov / 2)) *
    Math.PI / 180;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
  const limitingHalf = Math.max(1e-6, Math.min(
    verticalHalf,
    horizontalHalf,
  ));
  const fitDistance = paddedRadius / Math.sin(limitingHalf);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    fitDistance,
  );
  target.orthographicZoom = undefined;
  return target;
}

export function planKnowledgeGraphOrthographicCameraFitInto(
  contentRadius: number,
  currentCameraDistance: number,
  horizontalSpan: number,
  verticalSpan: number,
  currentCameraZoom: number,
  target: MutableKnowledgeGraphCameraFitPlanV1,
): MutableKnowledgeGraphCameraFitPlanV1 {
  const radius = positiveFinite(contentRadius, 1);
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const horizontalHalf = positiveFinite(horizontalSpan, 2) / 2;
  const verticalHalf = positiveFinite(verticalSpan, 2) / 2;
  const fitZoom = Math.min(horizontalHalf, verticalHalf) / paddedRadius;
  const currentZoom = positiveFinite(currentCameraZoom, 1);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    paddedRadius * 2,
  );
  target.orthographicZoom = positiveFinite(fitZoom, currentZoom);
  return target;
}
