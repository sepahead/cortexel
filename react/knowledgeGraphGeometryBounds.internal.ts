/** Pure, mutable scratch bounds for the exact schematic geometry in one frame. */
export interface KnowledgeGraphGeometryBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface KnowledgeGraphGeometryPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function createKnowledgeGraphGeometryBounds(): KnowledgeGraphGeometryBounds {
  return {
    minX: Infinity,
    minY: Infinity,
    minZ: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    maxZ: -Infinity,
  };
}

export function resetKnowledgeGraphGeometryBounds(bounds: KnowledgeGraphGeometryBounds): void {
  bounds.minX = bounds.minY = bounds.minZ = Infinity;
  bounds.maxX = bounds.maxY = bounds.maxZ = -Infinity;
}

export function isKnowledgeGraphGeometryBoundsFinite(
  bounds: KnowledgeGraphGeometryBounds,
): boolean {
  return (
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.minZ) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY) &&
    Number.isFinite(bounds.maxZ) &&
    bounds.minX <= bounds.maxX &&
    bounds.minY <= bounds.maxY &&
    bounds.minZ <= bounds.maxZ
  );
}

/** Reject an invalid point before changing any coordinate of the prior bounds. */
export function includeKnowledgeGraphGeometryPointInto(
  bounds: KnowledgeGraphGeometryBounds,
  x: number,
  y: number,
  z: number,
  radius = 0,
): boolean {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z) ||
    !Number.isFinite(radius) ||
    radius < 0 ||
    !Number.isFinite(x - radius) ||
    !Number.isFinite(x + radius) ||
    !Number.isFinite(y - radius) ||
    !Number.isFinite(y + radius) ||
    !Number.isFinite(z - radius) ||
    !Number.isFinite(z + radius)
  )
    return false;
  bounds.minX = Math.min(bounds.minX, x - radius);
  bounds.minY = Math.min(bounds.minY, y - radius);
  bounds.minZ = Math.min(bounds.minZ, z - radius);
  bounds.maxX = Math.max(bounds.maxX, x + radius);
  bounds.maxY = Math.max(bounds.maxY, y + radius);
  bounds.maxZ = Math.max(bounds.maxZ, z + radius);
  return true;
}

function quadraticExtremum(a: number, control: number, b: number): number {
  // Normalize before the derivative calculation. Finite endpoints must not
  // overflow a - 2*control + b and silently omit an interior extremum.
  const scale = Math.max(Math.abs(a), Math.abs(control), Math.abs(b));
  if (scale === 0) return a;
  const first = a / scale;
  const middle = control / scale;
  const last = b / scale;
  const t = (first - middle) / (first - 2 * middle + last);
  if (!(t > 0 && t < 1)) return a;
  const s = 1 - t;
  // A quadratic lies in its control hull. Clamp binary64 roundoff to that
  // normalized hull before rescaling a value near the finite-number limit.
  const value = s * s * first + 2 * s * t * middle + t * t * last;
  return (
    Math.max(Math.min(first, middle, last), Math.min(Math.max(first, middle, last), value)) * scale
  );
}

/**
 * Bound the current quadratic lane, including its true extrema. A control point
 * is not itself painted geometry. Bounding it, or reserving every possible lane,
 * needlessly shrinks sparse graphs. Hidden dash chords stay within this envelope.
 */
export function includeKnowledgeGraphQuadraticBoundsInto(
  bounds: KnowledgeGraphGeometryBounds,
  a: KnowledgeGraphGeometryPoint,
  control: KnowledgeGraphGeometryPoint,
  b: KnowledgeGraphGeometryPoint,
): boolean {
  if (
    !Number.isFinite(a.x) ||
    !Number.isFinite(a.y) ||
    !Number.isFinite(a.z) ||
    !Number.isFinite(control.x) ||
    !Number.isFinite(control.y) ||
    !Number.isFinite(control.z) ||
    !Number.isFinite(b.x) ||
    !Number.isFinite(b.y) ||
    !Number.isFinite(b.z)
  )
    return false;
  const x = quadraticExtremum(a.x, control.x, b.x);
  const y = quadraticExtremum(a.y, control.y, b.y);
  const z = quadraticExtremum(a.z, control.z, b.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
  bounds.minX = Math.min(bounds.minX, a.x, b.x, x);
  bounds.minY = Math.min(bounds.minY, a.y, b.y, y);
  bounds.minZ = Math.min(bounds.minZ, a.z, b.z, z);
  bounds.maxX = Math.max(bounds.maxX, a.x, b.x, x);
  bounds.maxY = Math.max(bounds.maxY, a.y, b.y, y);
  bounds.maxZ = Math.max(bounds.maxZ, a.z, b.z, z);
  return isKnowledgeGraphGeometryBoundsFinite(bounds);
}

function unit(value: KnowledgeGraphGeometryPoint): boolean {
  const norm = value.x * value.x + value.y * value.y + value.z * value.z;
  return Number.isFinite(norm) && Math.abs(norm - 1) < 1e-8;
}

function dot(a: KnowledgeGraphGeometryPoint, b: KnowledgeGraphGeometryPoint): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Project all eight AABB corners into an explicitly checked orthonormal camera basis. */
export function projectKnowledgeGraphGeometryBoundsInto(
  bounds: KnowledgeGraphGeometryBounds,
  center: KnowledgeGraphGeometryPoint,
  right: KnowledgeGraphGeometryPoint,
  up: KnowledgeGraphGeometryPoint,
  towardCamera: KnowledgeGraphGeometryPoint,
  target: KnowledgeGraphGeometryBounds,
): boolean {
  if (
    !isKnowledgeGraphGeometryBoundsFinite(bounds) ||
    !Number.isFinite(center.x) ||
    !Number.isFinite(center.y) ||
    !Number.isFinite(center.z) ||
    !unit(right) ||
    !unit(up) ||
    !unit(towardCamera) ||
    Math.abs(dot(right, up)) > 1e-8 ||
    Math.abs(dot(right, towardCamera)) > 1e-8 ||
    Math.abs(dot(up, towardCamera)) > 1e-8
  )
    return false;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let corner = 0; corner < 8; corner++) {
    const x = (corner & 1 ? bounds.maxX : bounds.minX) - center.x;
    const y = (corner & 2 ? bounds.maxY : bounds.minY) - center.y;
    const z = (corner & 4 ? bounds.maxZ : bounds.minZ) - center.z;
    const projectedX = x * right.x + y * right.y + z * right.z;
    const projectedY = x * up.x + y * up.y + z * up.z;
    const projectedZ = x * towardCamera.x + y * towardCamera.y + z * towardCamera.z;
    if (
      !Number.isFinite(projectedX) ||
      !Number.isFinite(projectedY) ||
      !Number.isFinite(projectedZ)
    )
      return false;
    minX = Math.min(minX, projectedX);
    minY = Math.min(minY, projectedY);
    minZ = Math.min(minZ, projectedZ);
    maxX = Math.max(maxX, projectedX);
    maxY = Math.max(maxY, projectedY);
    maxZ = Math.max(maxZ, projectedZ);
  }
  target.minX = minX;
  target.minY = minY;
  target.minZ = minZ;
  target.maxX = maxX;
  target.maxY = maxY;
  target.maxZ = maxZ;
  return isKnowledgeGraphGeometryBoundsFinite(target);
}
