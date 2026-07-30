/**
 * Source-bound NEST 3.10.0 time projection.
 *
 * NEST does not serialize `tics / tics_per_ms` as one correctly rounded exact
 * rational. `Time::get_ms()` first stores `1 / TICS_PER_MS` in binary64 and then
 * multiplies that binary64 reciprocal by the binary64 conversion of `tic_t`.
 * Keeping this small pure kernel shared prevents adapters, semantic validation,
 * rendering, and independent authority evaluation from inventing incompatible
 * endpoint clocks.
 */

const NEST_TIC_T_MAX = (1n << 63n) - 1n;
const NEST_TIME_INF_MARGIN = 8n;
const MAX_SAFE_TICS = BigInt(Number.MAX_SAFE_INTEGER);

export type NestTimeFailureKind =
  | 'source_profile'
  | 'numeric_resolution'
  | 'window_order';

export interface NestTimeFailure {
  readonly ok: false;
  readonly kind: NestTimeFailureKind;
  readonly message: string;
}

export interface NestTimeProjection {
  readonly ok: true;
  readonly milliseconds: number;
}

export type NestTimeProjectionResult = NestTimeProjection | NestTimeFailure;

export interface NestWindowProjectionInput {
  readonly ticsPerMs: bigint;
  readonly resolutionTics: bigint;
  /** Every caller-retained finite Time value participating in the authority. */
  readonly retainedTics: readonly bigint[];
  readonly lowerEndpointTics: bigint;
  readonly upperEndpointTics: bigint;
}

export interface NestWindowProjection {
  readonly ok: true;
  readonly lowerMilliseconds: number;
  readonly upperMilliseconds: number;
  readonly finiteTimeLimitTics: bigint;
}

export type NestWindowProjectionResult = NestWindowProjection | NestTimeFailure;

function failure(kind: NestTimeFailureKind, message: string): NestTimeFailure {
  return { ok: false, kind, message };
}

function sourceGetMillisecondsV310(tics: bigint, ticsPerMs: bigint): number {
  // These two casts and two arithmetic operations mirror the source expression
  // `Range::MS_PER_TIC * tics`, including binary64 conversion of int64 tics.
  const millisecondsPerTic = 1 / Number(ticsPerMs);
  return Number(tics) * millisecondsPerTic;
}

/** NEST `Time::compute_max()` for the admitted LP64 NEST 3.10.0 runtime. */
export function nestFiniteTimeLimitTicsV310(
  resolutionTics: bigint,
): bigint | undefined {
  if (resolutionTics <= 0n || resolutionTics > MAX_SAFE_TICS) return undefined;
  const marginLimited = NEST_TIC_T_MAX / NEST_TIME_INF_MARGIN;
  const limit = marginLimited - (marginLimited % resolutionTics);
  return limit > 0n ? limit : undefined;
}

/**
 * Reproduce NEST 3.10.0 `Time::get_ms()` and its non-negative `Time(ms)`
 * inverse check using the same sequence of binary64 operations.
 */
export function projectNestTicsToMillisecondsV310(
  tics: bigint,
  ticsPerMs: bigint,
): NestTimeProjectionResult {
  if (
    tics < 0n ||
    tics > MAX_SAFE_TICS ||
    ticsPerMs <= 0n ||
    ticsPerMs > MAX_SAFE_TICS
  ) {
    return failure(
      'source_profile',
      'the admitted NEST 3.10.0 source-clock subset requires non-negative tics and positive ticsPerMs no larger than Number.MAX_SAFE_INTEGER.',
    );
  }

  const ticsPerMsNumber = Number(ticsPerMs);
  // Deliberately preserve the source operations. Replacing this with an exact
  // rational changes genuine values such as 700 tics at 1000 tics/ms.
  const milliseconds = sourceGetMillisecondsV310(tics, ticsPerMs);
  if (!Number.isFinite(milliseconds)) {
    return failure(
      'source_profile',
      'the NEST 3.10.0 get_ms binary64 projection is not finite.',
    );
  }

  const recoveredNumber = Math.trunc(milliseconds * ticsPerMsNumber + 0.5);
  if (
    !Number.isSafeInteger(recoveredNumber) ||
    BigInt(recoveredNumber) !== tics
  ) {
    return failure(
      'source_profile',
      'the NEST 3.10.0 get_ms projection does not recover the declared tic with the pinned non-negative Time(ms) inverse.',
    );
  }
  return { ok: true, milliseconds };
}

/**
 * Validate the conservative finite-Time domain and project absolute endpoints.
 * Adjacent resolution-grid values must remain distinguishable in binary64; an
 * interval that aliases a neighboring NEST clock point is not renderable.
 */
export function projectNestWindowEndpointsV310(
  input: NestWindowProjectionInput,
): NestWindowProjectionResult {
  const finiteTimeLimitTics = nestFiniteTimeLimitTicsV310(input.resolutionTics);
  if (
    finiteTimeLimitTics === undefined ||
    input.ticsPerMs <= 0n ||
    input.ticsPerMs > MAX_SAFE_TICS
  ) {
    return failure(
      'source_profile',
      'the admitted NEST 3.10.0 source-clock subset requires positive safe-integer ticsPerMs and resolutionTics.',
    );
  }

  const operativeTics = [
    ...input.retainedTics,
    input.lowerEndpointTics,
    input.upperEndpointTics,
  ];
  for (const tics of operativeTics) {
    if (tics < 0n) {
      return failure(
        'source_profile',
        'every retained and combined NEST Time value must be non-negative.',
      );
    }
    if (tics >= finiteTimeLimitTics) {
      return failure(
        'source_profile',
        'every operative NEST Time value must be strictly below the pinned finite-Time limit.',
      );
    }
    if (tics > MAX_SAFE_TICS) {
      return failure(
        'source_profile',
        'every retained and combined NEST Time value in executable mapping profile 5 must be no larger than Number.MAX_SAFE_INTEGER.',
      );
    }
    const projected = projectNestTicsToMillisecondsV310(tics, input.ticsPerMs);
    if (!projected.ok) return projected;
  }

  if (!(input.upperEndpointTics > input.lowerEndpointTics)) {
    return failure(
      'window_order',
      'the exact upper endpoint tic must be strictly greater than the exact lower endpoint tic.',
    );
  }

  const lower = projectNestTicsToMillisecondsV310(
    input.lowerEndpointTics,
    input.ticsPerMs,
  );
  const upper = projectNestTicsToMillisecondsV310(
    input.upperEndpointTics,
    input.ticsPerMs,
  );
  if (!lower.ok) return lower;
  if (!upper.ok) return upper;
  if (!(upper.milliseconds > lower.milliseconds)) {
    return failure(
      'numeric_resolution',
      'the ordered NEST endpoint tics alias or invert after the pinned get_ms binary64 projection.',
    );
  }

  for (const [label, tics, projected] of [
    ['lower', input.lowerEndpointTics, lower.milliseconds],
    ['upper', input.upperEndpointTics, upper.milliseconds],
  ] as const) {
    for (const neighbor of [
      tics >= input.resolutionTics ? tics - input.resolutionTics : undefined,
      tics + input.resolutionTics < finiteTimeLimitTics
        ? tics + input.resolutionTics
        : undefined,
    ]) {
      if (neighbor === undefined) continue;
      // A neighboring NEST Time remains scientifically relevant even when its
      // integer tic exceeds Cortexel's conservative retained-safe-integer subset.
      // Reproduce get_ms directly over the source's finite int64 domain here;
      // do not require that unretained neighbor to pass the inverse declaration
      // roundtrip.
      const neighborMilliseconds = sourceGetMillisecondsV310(
        neighbor,
        input.ticsPerMs,
      );
      if (!Number.isFinite(neighborMilliseconds)) {
        return failure(
          'source_profile',
          `the ${label} endpoint's adjacent NEST resolution-grid value has a non-finite get_ms projection.`,
        );
      }
      if (Object.is(neighborMilliseconds, projected)) {
        return failure(
          'numeric_resolution',
          `the ${label} endpoint aliases its adjacent NEST resolution-grid value after the pinned get_ms binary64 projection.`,
        );
      }
    }
  }

  return {
    ok: true,
    lowerMilliseconds: lower.milliseconds,
    upperMilliseconds: upper.milliseconds,
    finiteTimeLimitTics,
  };
}
