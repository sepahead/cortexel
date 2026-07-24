import {
  exactBinary64Sum,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from './exact-binary64.js';

/** The registered extent-relative multiplier in cortexel_binary64_spatial_domain_membership_v1. */
export const SPATIAL_DOMAIN_TOLERANCE_EPSILON_MULTIPLIER = 8;
/** Maximum endpoint-rounding allowance, independently bounded by declared extent. */
export const SPATIAL_DOMAIN_ENDPOINT_ROUNDING_EPSILON_MULTIPLIER = 32;

const EPSILON_DENOMINATOR = 1n << 52n;
const TOLERANCE_NUMERATOR = BigInt(SPATIAL_DOMAIN_TOLERANCE_EPSILON_MULTIPLIER);
const ROUNDING_CAP_NUMERATOR = BigInt(
  SPATIAL_DOMAIN_ENDPOINT_ROUNDING_EPSILON_MULTIPLIER,
);

export interface SpatialDomainAxis {
  /** Correctly rounded once from the exact `center - extent / 2` rational. */
  readonly lower: number;
  /** Correctly rounded once from the exact `center + extent / 2` rational. */
  readonly upper: number;
  /** The canonicalized caller-declared extent; this, not `upper-lower`, is the period. */
  readonly period: number;
  readonly center: number;
  readonly extent: number;
  /** Twice the endpoint rounding errors, in minimum-subnormal integer units. */
  readonly lowerRoundingErrorTwiceUnits: bigint;
  readonly upperRoundingErrorTwiceUnits: bigint;
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/**
 * Materialize one spatial domain axis under the registered binary64 policy.
 *
 * The endpoint expression is evaluated as an exact rational over the received binary64
 * inputs and rounded once.  Its rounding allowance may not exceed the separately
 * registered extent-relative endpoint cap.  That cap is what prevents a huge absolute
 * origin from turning one endpoint ulp into an arbitrarily large scientific tolerance.
 */
export function spatialDomainAxis(center: number, extent: number): SpatialDomainAxis {
  if (!Number.isFinite(center) || !Number.isFinite(extent) || !(extent > 0)) {
    throw new Error('a spatial domain axis requires a finite center and positive finite extent');
  }

  const centerUnits = finiteBinary64ToMinSubnormalUnits(center);
  const extentUnits = finiteBinary64ToMinSubnormalUnits(extent);
  const lowerNumerator = 2n * centerUnits - extentUnits;
  const upperNumerator = 2n * centerUnits + extentUnits;
  const lower = exactRationalToBinary64(lowerNumerator, 2n, -1074);
  const upper = exactRationalToBinary64(upperNumerator, 2n, -1074);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error(
      'spatial domain endpoints are not a finite strictly ordered binary64 interval',
    );
  }

  const lowerUnits = finiteBinary64ToMinSubnormalUnits(lower);
  const upperUnits = finiteBinary64ToMinSubnormalUnits(upper);
  const lowerRoundingErrorTwiceUnits = absolute(2n * lowerUnits - lowerNumerator);
  const upperRoundingErrorTwiceUnits = absolute(2n * upperUnits - upperNumerator);

  // error/2 <= roundingCap*epsilon*extent. Cross-multiply exactly; never form a
  // tolerance that can underflow or scale with |center|.
  const roundingLimit = 2n * ROUNDING_CAP_NUMERATOR * extentUnits;
  if (
    lowerRoundingErrorTwiceUnits * EPSILON_DENOMINATOR > roundingLimit ||
    upperRoundingErrorTwiceUnits * EPSILON_DENOMINATOR > roundingLimit
  ) {
    throw new Error(
      'spatial domain endpoint rounding exceeds the extent-relative binary64 allowance',
    );
  }

  return {
    lower,
    upper,
    period: extent,
    center,
    extent,
    lowerRoundingErrorTwiceUnits,
    upperRoundingErrorTwiceUnits,
  };
}

/** Closed membership under the same exact extent-relative-plus-rounding allowance. */
export function spatialDomainAxisContains(axis: SpatialDomainAxis, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const valueUnits = finiteBinary64ToMinSubnormalUnits(value);
  const lowerUnits = finiteBinary64ToMinSubnormalUnits(axis.lower);
  const upperUnits = finiteBinary64ToMinSubnormalUnits(axis.upper);
  const extentUnits = finiteBinary64ToMinSubnormalUnits(axis.extent);

  // Allowance = multiplier*epsilon*extent + exact endpoint-rounding error.
  // Use denominator 2^53 for both terms:
  //   relative = multiplier * extentUnits / 2^52
  //   rounding = errorTwiceUnits / 2.
  const lowerAllowanceNumerator =
    2n * TOLERANCE_NUMERATOR * extentUnits +
    axis.lowerRoundingErrorTwiceUnits * EPSILON_DENOMINATOR;
  const upperAllowanceNumerator =
    2n * TOLERANCE_NUMERATOR * extentUnits +
    axis.upperRoundingErrorTwiceUnits * EPSILON_DENOMINATOR;
  const denominator = 2n * EPSILON_DENOMINATOR;

  return (
    (valueUnits - lowerUnits) * denominator + lowerAllowanceNumerator >= 0n &&
    (valueUnits - upperUnits) * denominator - upperAllowanceNumerator <= 0n
  );
}

export interface SpatialPoint2D {
  readonly x: number;
  readonly y: number;
}

export interface SpatialRoutingDomain {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly periodX: number;
  readonly periodY: number;
  readonly periodicX: boolean;
  readonly periodicY: boolean;
  readonly edgeChordRule: 'minimum_image' | 'straight_chord' | 'open';
}

export type SpatialChordPathKind =
  | 'autapse_loop'
  | 'straight_chord'
  | `minimum_image_${'direct' | 'wrapped'}`
  | `minimum_image_${'direct' | 'wrapped'}_half_period_tie_${'x' | 'y' | 'xy'}`;

export interface SpatialChordRoute {
  readonly dx: number;
  readonly dy: number;
  readonly wrappedX: boolean;
  readonly wrappedY: boolean;
  readonly halfPeriodTieX: boolean;
  readonly halfPeriodTieY: boolean;
  readonly pathKind: SpatialChordPathKind;
}

function exactMinimumImageDisplacement(
  source: number,
  target: number,
  period: number,
): { readonly displacement: number; readonly wrapped: boolean; readonly tie: boolean } {
  if (!Number.isFinite(source) || !Number.isFinite(target) || !Number.isFinite(period) || !(period > 0)) {
    throw new Error('minimum-image routing requires finite coordinates and a positive finite period');
  }
  const sourceUnits = finiteBinary64ToMinSubnormalUnits(source);
  const targetUnits = finiteBinary64ToMinSubnormalUnits(target);
  const periodUnits = finiteBinary64ToMinSubnormalUnits(period);
  const raw = targetUnits - sourceUnits;
  let positiveRemainder = raw % periodUnits;
  if (positiveRemainder < 0n) positiveRemainder += periodUnits;
  const doubled = 2n * positiveRemainder;
  const minimum = doubled <= periodUnits
    ? positiveRemainder
    : positiveRemainder - periodUnits;
  const tie = doubled === periodUnits;
  const displacement = exactRationalToBinary64(minimum, 1n, -1074);
  if (!Number.isFinite(displacement)) {
    throw new Error('minimum-image displacement is outside finite binary64');
  }
  return { displacement, wrapped: minimum !== raw, tie };
}

/**
 * Classify one canonically oriented unordered physical chord.
 *
 * Callers orient distinct endpoints by declared node-universe order before invoking this
 * function.  Reciprocal source rows then share this one path; arrow direction is layered
 * onto the path separately.  Exact half-period ties choose the positive axis remainder.
 */
export function classifySpatialChord(
  source: SpatialPoint2D,
  target: SpatialPoint2D,
  domain: SpatialRoutingDomain | undefined,
  autapse = false,
): SpatialChordRoute {
  if (autapse) {
    return {
      dx: 0,
      dy: 0,
      wrappedX: false,
      wrappedY: false,
      halfPeriodTieX: false,
      halfPeriodTieY: false,
      pathKind: 'autapse_loop',
    };
  }

  const rawDx = exactRationalToBinary64(
    finiteBinary64ToMinSubnormalUnits(target.x) - finiteBinary64ToMinSubnormalUnits(source.x),
    1n,
    -1074,
  );
  const rawDy = exactRationalToBinary64(
    finiteBinary64ToMinSubnormalUnits(target.y) - finiteBinary64ToMinSubnormalUnits(source.y),
    1n,
    -1074,
  );
  if (!Number.isFinite(rawDx) || !Number.isFinite(rawDy)) {
    throw new Error('spatial chord displacement is outside finite binary64');
  }
  if (!domain || domain.edgeChordRule !== 'minimum_image') {
    return {
      dx: rawDx,
      dy: rawDy,
      wrappedX: false,
      wrappedY: false,
      halfPeriodTieX: false,
      halfPeriodTieY: false,
      pathKind: 'straight_chord',
    };
  }

  const x = domain.periodicX
    ? exactMinimumImageDisplacement(source.x, target.x, domain.periodX)
    : { displacement: rawDx, wrapped: false, tie: false };
  const y = domain.periodicY
    ? exactMinimumImageDisplacement(source.y, target.y, domain.periodY)
    : { displacement: rawDy, wrapped: false, tie: false };
  const wrapped = x.wrapped || y.wrapped;
  const tieAxes = `${x.tie ? 'x' : ''}${y.tie ? 'y' : ''}` as '' | 'x' | 'y' | 'xy';
  const pathKind: SpatialChordPathKind = tieAxes === ''
    ? `minimum_image_${wrapped ? 'wrapped' : 'direct'}`
    : `minimum_image_${wrapped ? 'wrapped' : 'direct'}_half_period_tie_${tieAxes}`;
  return {
    dx: x.displacement,
    dy: y.displacement,
    wrappedX: x.wrapped,
    wrappedY: y.wrapped,
    halfPeriodTieX: x.tie,
    halfPeriodTieY: y.tie,
    pathKind,
  };
}

export interface RoutedSpatialChord extends SpatialChordRoute {
  readonly segments: readonly (readonly [SpatialPoint2D, SpatialPoint2D])[];
}

/** Split a classified minimum-image chord at the displayed domain boundaries. */
export function routeSpatialChord(
  source: SpatialPoint2D,
  target: SpatialPoint2D,
  domain: SpatialRoutingDomain | undefined,
  autapse = false,
): RoutedSpatialChord {
  const route = classifySpatialChord(source, target, domain, autapse);
  if (!domain || route.pathKind === 'autapse_loop' || (!route.wrappedX && !route.wrappedY)) {
    return { ...route, segments: [[source, target]] };
  }

  const end = {
    x: exactBinary64Sum([source.x, route.dx]),
    y: exactBinary64Sum([source.y, route.dy]),
  };
  if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) {
    throw new Error('minimum-image route endpoint is outside finite binary64');
  }
  if (
    (route.dx !== 0 && end.x === source.x) ||
    (route.dy !== 0 && end.y === source.y)
  ) {
    throw new Error('minimum-image route displacement collapses at the coordinate origin');
  }
  const crossings: { t: number; shiftX: number; shiftY: number }[] = [];
  if (route.wrappedX && end.x < domain.xMin) {
    crossings.push({ t: (domain.xMin - source.x) / route.dx, shiftX: domain.periodX, shiftY: 0 });
  } else if (route.wrappedX && end.x > domain.xMax) {
    crossings.push({ t: (domain.xMax - source.x) / route.dx, shiftX: -domain.periodX, shiftY: 0 });
  }
  if (route.wrappedY && end.y < domain.yMin) {
    crossings.push({ t: (domain.yMin - source.y) / route.dy, shiftX: 0, shiftY: domain.periodY });
  } else if (route.wrappedY && end.y > domain.yMax) {
    crossings.push({ t: (domain.yMax - source.y) / route.dy, shiftX: 0, shiftY: -domain.periodY });
  }
  for (const crossing of crossings) {
    if (!Number.isFinite(crossing.t) || crossing.t < 0 || crossing.t > 1) {
      throw new Error('minimum-image boundary crossing is outside the routed chord');
    }
  }
  crossings.sort((left, right) => left.t - right.t);
  const grouped: { t: number; shiftX: number; shiftY: number }[] = [];
  for (const crossing of crossings) {
    const previous = grouped[grouped.length - 1];
    if (previous && crossing.t === previous.t) {
      previous.shiftX += crossing.shiftX;
      previous.shiftY += crossing.shiftY;
    } else {
      grouped.push({ ...crossing });
    }
  }

  const segments: [SpatialPoint2D, SpatialPoint2D][] = [];
  let previousT = 0;
  let offsetX = 0;
  let offsetY = 0;
  for (const crossing of grouped) {
    const start = {
      x: source.x + route.dx * previousT + offsetX,
      y: source.y + route.dy * previousT + offsetY,
    };
    const boundary = {
      x: source.x + route.dx * crossing.t + offsetX,
      y: source.y + route.dy * crossing.t + offsetY,
    };
    if (start.x !== boundary.x || start.y !== boundary.y) segments.push([start, boundary]);
    offsetX += crossing.shiftX;
    offsetY += crossing.shiftY;
    previousT = crossing.t;
  }
  const finalStart = {
    x: source.x + route.dx * previousT + offsetX,
    y: source.y + route.dy * previousT + offsetY,
  };
  if (finalStart.x !== target.x || finalStart.y !== target.y) segments.push([finalStart, target]);
  if (segments.length === 0) {
    throw new Error('minimum-image route collapsed to zero visible length');
  }
  return { ...route, segments };
}

export function reverseSpatialSegments(
  segments: readonly (readonly [SpatialPoint2D, SpatialPoint2D])[],
): readonly (readonly [SpatialPoint2D, SpatialPoint2D])[] {
  return [...segments].reverse().map(([from, to]) => [to, from] as const);
}
