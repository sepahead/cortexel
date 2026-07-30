/**
 * Event, bin, window, and rate semantics.
 *
 * Spike analyses are deceptively easy to draw and easy to get subtly wrong. Every
 * rule here exists because the wrong version of it produces a figure that looks
 * completely reasonable and says something false.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  binary64RelativeDifferenceWithinTolerance,
  exactBinary64Sum,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from '../exact-binary64.js';
import {
  axesAreCompatible,
  compareExactUnitSumToValue,
  convert,
  dimensionOf,
  divideExactIntegerByConvertedDifference,
  isKnownUnit,
  kindAcceptsDimension,
  reciprocalUnit,
} from '../units.js';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  getData,
  getParameters,
  NUMERIC_TOLERANCE,
  readPointer,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';
import { checkReferencesInUniverse } from './structure.js';
import { legalKnownUnit } from './units.js';
import { MAX_MATERIALIZED_BINS, materializeWidthBins } from '../binning.js';
import {
  nestFiniteTimeLimitTicsV310,
  projectNestTicsToMillisecondsV310,
  projectNestWindowEndpointsV310,
} from './nest-time.js';

const NEST_FINITE_STOP_WINDOW_KIND = 'nest_recording_device_origin_relative';
const NEST_CAPTURE_BOUNDED_WINDOW_KIND =
  'nest_recording_device_positive_infinity_capture_bounded';

function nestWindowKind(window: Record<string, unknown>):
  | 'finite_stop'
  | 'positive_infinity_capture_bounded'
  | undefined {
  const kind = asString(window.kind);
  if (kind === NEST_FINITE_STOP_WINDOW_KIND) return 'finite_stop';
  if (kind === NEST_CAPTURE_BOUNDED_WINDOW_KIND) {
    return 'positive_infinity_capture_bounded';
  }
  return undefined;
}

interface NestProjectedEndpoints {
  readonly lowerMs: number;
  readonly upperMs: number;
}

const CANONICAL_NEST_TIC = /^(?:0|[1-9][0-9]*)$/u;

function nestTic(value: unknown): bigint | undefined {
  const text = asString(value);
  return text !== undefined && text.length <= 32 && CANONICAL_NEST_TIC.test(text)
    ? BigInt(text)
    : undefined;
}

/**
 * Project the two absolute NEST endpoints from their integer-tic authority.
 *
 * The separately serialized `origin`, `start`, and `stop` fields are useful
 * human-scale projections, but adding those binary64 values would round twice.
 * Endpoint membership is defined by adding tics first and then reproducing the
 * pinned binary64 reciprocal-and-multiply `Time::get_ms()` source sequence.
 */
function projectNestEndpoints(
  window: Record<string, unknown>,
  captureBounded: boolean,
): NestProjectedEndpoints | undefined {
  const captureAuthority = asRecord(window.captureAuthority);
  const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
  const recordingGrid = asRecord(captureAuthority?.recordingGrid);
  const ticsPerMs = nestTic(runtimeStatus?.ticsPerMs);
  const resolutionTics = nestTic(runtimeStatus?.resolutionTics);
  const captureTics = nestTic(runtimeStatus?.captureBiologicalTimeTics);
  const originTics = nestTic(recordingGrid?.originTics);
  const startTics = nestTic(recordingGrid?.startTics);
  const upperTics = captureBounded
    ? captureTics
    : nestTic(recordingGrid?.stopTics);
  const bufferEpoch = asRecord(captureAuthority?.bufferEpoch);
  const recordingPlan = asRecord(captureAuthority?.recordingPlan);
  const bufferTics = nestTic(bufferEpoch?.beganAtBiologicalTimeTics);
  const mutationTics = nestTic(recordingPlan?.lastMutationAtBiologicalTimeTics);
  const resolutionMs = asNumber(runtimeStatus?.resolutionMs);
  const originMs = asNumber(window.origin);
  const startMs = asNumber(window.start);
  const upperMs = asNumber(captureBounded ? window.captureTime : window.stop);
  if (
    ticsPerMs === undefined ||
    resolutionTics === undefined ||
    captureTics === undefined ||
    originTics === undefined ||
    startTics === undefined ||
    upperTics === undefined ||
    bufferTics === undefined ||
    mutationTics === undefined ||
    resolutionMs === undefined ||
    originMs === undefined ||
    startMs === undefined ||
    upperMs === undefined ||
    asString(runtimeStatus?.timeBuildProfile) !==
      'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1'
  ) return undefined;

  for (const [tics, milliseconds] of [
    [resolutionTics, resolutionMs],
    [originTics, originMs],
    [startTics, startMs],
    [upperTics, upperMs],
  ] as const) {
    const sourceProjection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!sourceProjection.ok || !Object.is(sourceProjection.milliseconds, milliseconds)) {
      return undefined;
    }
  }

  const retainedTics = [
    originTics,
    startTics,
    upperTics,
    captureTics,
    bufferTics,
    mutationTics,
  ];
  if (
    resolutionTics === 0n ||
    retainedTics.some((tics) => tics % resolutionTics !== 0n)
  ) return undefined;

  const projection = projectNestWindowEndpointsV310({
    ticsPerMs,
    resolutionTics,
    retainedTics,
    lowerEndpointTics: originTics + startTics,
    upperEndpointTics: captureBounded ? upperTics : originTics + upperTics,
  });
  return projection.ok
    ? {
        lowerMs: projection.lowerMilliseconds,
        upperMs: projection.upperMilliseconds,
      }
    : undefined;
}

/** Resolve bin edges from either an explicit edge list or a width that tiles a range. */
export function resolveBinEdges(spec: Record<string, unknown> | undefined): number[] | undefined {
  if (!spec) return undefined;

  const mode = asString(spec.mode);

  if (mode === 'edges') {
    const edges = asArray(spec.edges);
    if (!edges) return undefined;
    const numeric = edges.map(asNumber);
    return numeric.every((value): value is number => value !== undefined)
      ? (numeric as number[])
      : undefined;
  }

  if (mode === 'width') {
    const width = asNumber(spec.width);
    const start = asNumber(spec.start);
    const stop = asNumber(spec.stop);
    if (width === undefined || start === undefined || stop === undefined) return undefined;
    if (!(width > 0) || !(stop > start)) return undefined;

    const result = materializeWidthBins(start, stop, width);
    return result.ok ? [...result.edges] : undefined;
  }

  return undefined;
}

/**
 * A population-rate figure has one declared observation window and one binned
 * domain. Their physical outer endpoints must be the same quantities, even when
 * written in different registered time units.
 *
 * This comparison stays exact. Converting an edge to binary64 first can make two
 * physically distinct declarations round to the same number (for example
 * `0.3 ms` and `0.0003 s`), after which validation could no longer recover the
 * contradiction.
 */
function populationRateBinsBindWindow(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'neuro.population_rate') return [];

  const data = getData(context);
  const parameters = getParameters(context);
  const window = asRecord(data.window);
  const windowStart = asNumber(window?.start);
  const windowStop = asNumber(window?.stop);
  const windowUnit = asString(window?.unit);
  if (windowStart === undefined || windowStop === undefined || !windowUnit) return [];

  let firstEdge: number | undefined;
  let lastEdge: number | undefined;
  let binUnit: string | undefined;
  let firstPath: (string | number)[];
  let lastPath: (string | number)[];

  if (asString(data.mode) === 'events') {
    const bins = asRecord(parameters.bins);
    binUnit = asString(bins?.unit);
    if (asString(bins?.mode) === 'width') {
      firstEdge = asNumber(bins?.start);
      lastEdge = asNumber(bins?.stop);
      firstPath = ['parameters', 'bins', 'start'];
      lastPath = ['parameters', 'bins', 'stop'];
    } else {
      const edgeValues = asArray(bins?.edges);
      firstEdge = asNumber(edgeValues?.[0]);
      lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
      firstPath = ['parameters', 'bins', 'edges', 0];
      lastPath = ['parameters', 'bins', 'edges', Math.max(0, (edgeValues?.length ?? 1) - 1)];
    }
  } else if (asString(data.mode) === 'prebinned') {
    const binEdges = asRecord(data.binEdges);
    const edgeValues = asArray(binEdges?.edges);
    firstEdge = asNumber(edgeValues?.[0]);
    lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
    binUnit = asString(binEdges?.unit);
    firstPath = ['data', 'binEdges', 'edges', 0];
    lastPath = ['data', 'binEdges', 'edges', Math.max(0, (edgeValues?.length ?? 1) - 1)];
  } else {
    return [];
  }

  if (firstEdge === undefined || lastEdge === undefined || !binUnit) return [];

  const errors: CortexelError[] = [];
  const checks = [
    {
      edge: firstEdge,
      windowValue: windowStart,
      windowName: 'start',
      at: firstPath,
    },
    {
      edge: lastEdge,
      windowValue: windowStop,
      windowName: 'stop',
      at: lastPath,
    },
  ] as const;

  for (const check of checks) {
    let comparison: -1 | 0 | 1;
    try {
      comparison = compareExactUnitSumToValue(
        [{ value: check.edge, unit: binUnit }],
        { value: check.windowValue, unit: windowUnit },
      );
    } catch {
      // Canonical-code and dimension validators own invalid/incompatible units.
      // This rule owns only the equality of otherwise comparable endpoints.
      continue;
    }
    if (comparison === 0) continue;

    errors.push(
      makeError({
        code: 'SCIENCE_BIN_EDGES_INVALID',
        stage: 'science',
        instancePath: pointer(...check.at),
        validatorId: 'bins.strictly_increasing',
        message: `population-rate bins must tile exactly the declared observation window: the ${check.windowName} bin edge ${check.edge} ${binUnit} is not exactly equal to window ${check.windowName} ${check.windowValue} ${windowUnit}. Rounded unit conversion is not sufficient because it can conceal a real boundary mismatch.`,
      }),
    );
  }

  return errors;
}

export const binsStrictlyIncreasing: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const errors: CortexelError[] = [];

  const check = (edges: unknown, at: (string | number)[]): void => {
    const array = asArray(edges);
    if (!array) return;

    for (let i = 0; i < array.length; i++) {
      const value = asNumber(array[i]);
      if (value === undefined) {
        errors.push(
          makeError({
            code: 'SCIENCE_BIN_EDGES_INVALID',
            stage: 'science',
            instancePath: pointer(...at, i),
            validatorId: 'bins.strictly_increasing',
            message: 'a bin edge must be a finite number.',
          }),
        );
        return;
      }
      if (i > 0) {
        const previous = asNumber(array[i - 1]);
        if (previous !== undefined && !(value > previous)) {
          errors.push(
            makeError({
              code: 'SCIENCE_BIN_EDGES_INVALID',
              stage: 'science',
              instancePath: pointer(...at, i),
              validatorId: 'bins.strictly_increasing',
              message: `bin edges must be strictly increasing: edge ${i} (${value}) is not greater than edge ${i - 1} (${previous}). A zero-width or inverted bin has no meaning.`,
            }),
          );
          return;
        }
      }
    }
  };

  const data = getData(context);
  const parameters = getParameters(context);

  check(asRecord(data.binEdges)?.edges, ['data', 'binEdges', 'edges']);
  check(asRecord(parameters.bins)?.edges, ['parameters', 'bins', 'edges']);

  // A width-mode spec must also tile a real interval.
  for (const [container, at] of [
    [asRecord(parameters.bins), ['parameters', 'bins']],
  ] as const) {
    if (!container || asString(container.mode) !== 'width') continue;
    const width = asNumber(container.width);
    const start = asNumber(container.start);
    const stop = asNumber(container.stop);
    if (width !== undefined && !(width > 0)) {
      errors.push(
        makeError({
          code: 'SCIENCE_BIN_EDGES_INVALID',
          stage: 'science',
          instancePath: pointer(...at, 'width'),
          validatorId: 'bins.strictly_increasing',
          message: 'the bin width must be positive.',
        }),
      );
    }
    if (start !== undefined && stop !== undefined && !(stop > start)) {
      errors.push(
        makeError({
          code: 'SCIENCE_BIN_EDGES_INVALID',
          stage: 'science',
          instancePath: pointer(...at, 'stop'),
          validatorId: 'bins.strictly_increasing',
          message: 'the binned range must be non-empty: stop must be greater than start.',
        }),
      );
    }
    if (width !== undefined && start !== undefined && stop !== undefined && width > 0 && stop > start) {
      const materialized = materializeWidthBins(start, stop, width);
      if (!materialized.ok) {
        errors.push(
          makeError({
            code: 'SCIENCE_BIN_EDGES_INVALID',
            stage: 'science',
            instancePath: pointer(...at, 'width'),
            validatorId: 'bins.strictly_increasing',
            message: `the width-mode specification cannot be materialized as at most ${MAX_MATERIALIZED_BINS} strictly increasing binary64 bins over the declared range. Increase the width or use explicit edges.`,
          }),
        );
      }
    }
  }

  errors.push(...populationRateBinsBindWindow(context));
  return errors;
};

export const windowValid: SemanticValidator = (context: SemanticContext): CortexelError[] => {
  const at = asString(context.parameters?.pointer) ?? '/data/window';
  const window = asRecord(readPointer(context.request, at));
  if (!window) return [];

  const nestKind = nestWindowKind(window);
  const nestWindow = nestKind !== undefined;
  const captureBounded = nestKind === 'positive_infinity_capture_bounded';
  const origin = asNumber(window.origin);
  const start = asNumber(window.start);
  const upper = asNumber(captureBounded ? window.captureTime : window.stop);
  const upperName = captureBounded ? 'captureTime' : 'stop';
  const unit = asString(window.unit);
  const unitDimension = asString(context.parameters?.unitDimension);
  if (
    unit !== undefined &&
    isKnownUnit(unit) &&
    unitDimension !== undefined &&
    dimensionOf(unit) !== unitDimension
  ) {
    return [
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: `${at}/unit`,
        validatorId: 'window.valid',
        message: `this interval requires unit dimension ${JSON.stringify(unitDimension)}; got ${JSON.stringify(unit)} with dimension ${JSON.stringify(dimensionOf(unit))}.`,
      }),
    ];
  }

  // Structural validation normally owns non-finite JSON numbers. Keep this
  // semantic boundary total when called directly, however: a non-finite clock
  // endpoint cannot define a scientific interval.
  for (const [name, value] of [
    ...(nestWindow ? [['origin', window.origin] as const] : []),
    ['start', window.start] as const,
    [upperName, captureBounded ? window.captureTime : window.stop] as const,
  ]) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return [
        makeError({
          code: 'SCIENCE_WINDOW_INVALID',
          stage: 'science',
          instancePath: `${at}/${name}`,
          validatorId: 'window.valid',
          message: `the observation-window ${name} must be finite.`,
        }),
      ];
    }
  }

  if (nestWindow && origin === undefined) return [];
  if (start === undefined || upper === undefined) return [];

  if (!nestWindow && !(upper > start)) {
    return [
      makeError({
        code: 'SCIENCE_WINDOW_INVALID',
        stage: 'science',
        instancePath: `${at}/${upperName}`,
        validatorId: 'window.valid',
        message: `the observation window is empty or inverted (start ${start}, stop ${upper}). It must satisfy start < stop.`,
      }),
    ];
  }

  if (!nestWindow || !unit || dimensionOf(unit) !== 'time') return [];

  const captureAuthority = asRecord(window.captureAuthority);
  const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
  const recordingGrid = asRecord(captureAuthority?.recordingGrid);
  const bufferEpoch = asRecord(captureAuthority?.bufferEpoch);
  const recordingPlan = asRecord(captureAuthority?.recordingPlan);
  const resolutionMs = asNumber(runtimeStatus?.resolutionMs);
  const ticsPerMsText = asString(runtimeStatus?.ticsPerMs);
  const resolutionTicsText = asString(runtimeStatus?.resolutionTics);
  const captureTicsText = asString(runtimeStatus?.captureBiologicalTimeTics);
  const originTicsText = asString(recordingGrid?.originTics);
  const startTicsText = asString(recordingGrid?.startTics);
  const stopTicsText = captureBounded
    ? undefined
    : asString(recordingGrid?.stopTics);
  const bufferTicsText = asString(bufferEpoch?.beganAtBiologicalTimeTics);
  const mutationTicsText = asString(recordingPlan?.lastMutationAtBiologicalTimeTics);
  const requiredTicText = [
    ticsPerMsText,
    resolutionTicsText,
    captureTicsText,
    originTicsText,
    startTicsText,
    ...(captureBounded ? [] : [stopTicsText]),
    bufferTicsText,
    mutationTicsText,
  ];
  if (
    resolutionMs === undefined ||
    requiredTicText.some((value) => value === undefined)
  ) {
    // The closed schema owns missing or malformed capture-authority members.
    return [];
  }

  if (requiredTicText.some(
    (value) =>
      value === undefined ||
      value.length === 0 ||
      value.length > 32 ||
      !CANONICAL_NEST_TIC.test(value),
  )) {
    // The closed schema owns malformed decimal strings.
    return [];
  }

  const ticsPerMs = BigInt(ticsPerMsText!);
  const resolutionTics = BigInt(resolutionTicsText!);
  const captureBiologicalTimeTics = BigInt(captureTicsText!);
  const originTics = BigInt(originTicsText!);
  const startTics = BigInt(startTicsText!);
  const stopTics = stopTicsText === undefined ? undefined : BigInt(stopTicsText);
  const beganAtBiologicalTimeTics = BigInt(bufferTicsText!);
  const lastMutationAtBiologicalTimeTics = BigInt(mutationTicsText!);
  if (ticsPerMs === 0n || resolutionTics === 0n) return [];

  const maximumSafeTics = BigInt(Number.MAX_SAFE_INTEGER);
  const ticsPerMsPath = `${at}/captureAuthority/runtimeStatus/ticsPerMs`;
  const resolutionTicsPath = `${at}/captureAuthority/runtimeStatus/resolutionTics`;
  const errors: CortexelError[] = [];
  const sourceInvalidNames = new Set<string>();
  const unsafeTicNames = new Set<string>();
  const sourceFailure = (
    name: string,
    instancePath: string,
    message: string,
  ): void => {
    sourceInvalidNames.add(name);
    errors.push(
      makeError({
        code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        stage: 'provenance',
        instancePath,
        validatorId: 'window.valid',
        message,
      }),
    );
  };
  const unsafeTicFailure = (
    name: string,
    instancePath: string,
    message: string,
  ): void => {
    unsafeTicNames.add(name);
    sourceFailure(name, instancePath, message);
  };

  if (ticsPerMs > maximumSafeTics) {
    sourceFailure(
      'ticsPerMs',
      ticsPerMsPath,
      'ticsPerMs is outside executable mapping profile 5; it must be a positive safe integer.',
    );
  }
  const finiteTimeLimitTics =
    resolutionTics <= maximumSafeTics
      ? nestFiniteTimeLimitTicsV310(resolutionTics)
      : undefined;
  if (finiteTimeLimitTics === undefined) {
    unsafeTicFailure(
      'resolutionTics',
      resolutionTicsPath,
      'resolutionTics is outside the pinned LP64/int64 NEST 3.10.0 finite-Time build profile.',
    );
  }

  const captureTicsPath =
    `${at}/captureAuthority/runtimeStatus/captureBiologicalTimeTics`;
  const originTicsPath = `${at}/captureAuthority/recordingGrid/originTics`;
  const startTicsPath = `${at}/captureAuthority/recordingGrid/startTics`;
  const stopTicsPath = `${at}/captureAuthority/recordingGrid/stopTics`;
  const bufferTicsPath =
    `${at}/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics`;
  const mutationTicsPath =
    `${at}/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics`;
  const projectionChecks: Array<
    readonly [string, bigint, number, string, string]
  > = [
    [
      'resolutionTics',
      resolutionTics,
      resolutionMs,
      `${at}/captureAuthority/runtimeStatus/resolutionMs`,
      'resolutionMs',
    ],
    [
      'originTics',
      originTics,
      origin!,
      originTicsPath,
      'origin',
    ],
    [
      'startTics',
      startTics,
      start,
      startTicsPath,
      'start',
    ],
  ];
  if (captureBounded) {
    projectionChecks.push([
      'captureBiologicalTimeTics',
      captureBiologicalTimeTics,
      upper,
      captureTicsPath,
      'captureTime',
    ]);
  } else if (stopTics !== undefined) {
    projectionChecks.push([
      'stopTics',
      stopTics,
      upper,
      stopTicsPath,
      'stop',
    ]);
  }
  const retainedTics: Array<readonly [string, bigint, string, string]> = [
    [
      'resolutionTics',
      resolutionTics,
      resolutionTicsPath,
      'resolutionTics',
    ],
    [
      'originTics',
      originTics,
      originTicsPath,
      'originTics',
    ],
    [
      'startTics',
      startTics,
      startTicsPath,
      'startTics',
    ],
    [
      'captureBiologicalTimeTics',
      captureBiologicalTimeTics,
      captureTicsPath,
      'captureBiologicalTimeTics',
    ],
    [
      'beganAtBiologicalTimeTics',
      beganAtBiologicalTimeTics,
      bufferTicsPath,
      'beganAtBiologicalTimeTics',
    ],
    [
      'lastMutationAtBiologicalTimeTics',
      lastMutationAtBiologicalTimeTics,
      mutationTicsPath,
      'lastMutationAtBiologicalTimeTics',
    ],
  ];
  if (stopTics !== undefined) {
    retainedTics.splice(3, 0, [
      'stopTics',
      stopTics,
      stopTicsPath,
      'stopTics',
    ]);
  }
  const gridChecks = retainedTics.filter(
    ([name]) => name !== 'resolutionTics',
  );
  const absoluteStartTics = originTics + startTics;
  const absoluteUpperTics = captureBounded
    ? captureBiologicalTimeTics
    : originTics + stopTics!;

  const retainedProjections = new Map<string, number>();
  for (const [name, tics, instancePath, label] of retainedTics) {
    if (unsafeTicNames.has(name)) continue;
    if (
      tics > maximumSafeTics ||
      (finiteTimeLimitTics !== undefined && tics >= finiteTimeLimitTics)
    ) {
      unsafeTicFailure(
        name,
        instancePath,
        `${label} is outside executable mapping profile 5: it must be a safe integer${
          finiteTimeLimitTics === undefined
            ? '.'
            : ' strictly below the pinned finite-Time limit.'
        }`,
      );
      continue;
    }
    if (sourceInvalidNames.has('ticsPerMs')) continue;
    const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!projection.ok) {
      sourceFailure(
        name,
        instancePath,
        `${label} is outside executable mapping profile 5: ${projection.message}`,
      );
      continue;
    }
    retainedProjections.set(name, projection.milliseconds);
  }

  // Parallel human-scale fields are source claims, not an alternative clock.
  // Compare them only when the corresponding primitive was independently
  // admitted and round-tripped through the pinned get_ms implementation.
  for (const [name, , milliseconds, instancePath, label] of projectionChecks) {
    const projected = retainedProjections.get(name);
    if (projected === undefined) continue;
    if (!Object.is(projected, milliseconds)) {
      sourceFailure(
        name,
        instancePath,
        `${label} is not the pinned NEST 3.10.0 get_ms binary64 projection of its declared integer-tic preimage.`,
      );
    }
  }

  let gridInvalid = false;
  if (!unsafeTicNames.has('resolutionTics')) {
    for (const [name, tics, instancePath, label] of gridChecks) {
      if (unsafeTicNames.has(name) || tics % resolutionTics === 0n) continue;
      gridInvalid = true;
      errors.push(
        makeError({
          code: 'SCIENCE_WINDOW_INVALID',
          stage: 'science',
          instancePath,
          validatorId: 'window.valid',
          message:
            `${label} is not on the declared NEST runtime resolution grid.`,
        }),
      );
    }
  }

  const upperAuthorityPath = captureBounded
    ? captureTicsPath
    : stopTicsPath;
  const absoluteStartOperandsSafe =
    !unsafeTicNames.has('originTics') &&
    !unsafeTicNames.has('startTics');
  const absoluteUpperOperandsSafe = captureBounded
    ? !unsafeTicNames.has('captureBiologicalTimeTics')
    : !unsafeTicNames.has('originTics') && !unsafeTicNames.has('stopTics');
  const exactIntervalOrdered =
    absoluteStartOperandsSafe && absoluteUpperOperandsSafe
      ? absoluteUpperTics > absoluteStartTics
      : undefined;
  if (exactIntervalOrdered === false) {
    errors.push(
      makeError({
        code: 'SCIENCE_WINDOW_INVALID',
        stage: 'science',
        instancePath: upperAuthorityPath,
        validatorId: 'window.valid',
        message: captureBounded
          ? 'the NEST positive-infinity capture time must be strictly later than originTics + startTics; a capture at the open start has no complete observation interval.'
          : 'the NEST finite stop must be strictly later than start on the declared integer-tic clock.',
      }),
    );
  }

  if (
    exactIntervalOrdered === true &&
    !captureBounded &&
    stopTics !== undefined &&
    !unsafeTicNames.has('captureBiologicalTimeTics')
  ) {
    if (captureBiologicalTimeTics < absoluteUpperTics) {
      errors.push(
        makeError({
          code: 'SCIENCE_WINDOW_INVALID',
          stage: 'science',
          instancePath: captureTicsPath,
          validatorId: 'window.valid',
          message:
            'the NEST capture time is earlier than originTics + stopTics. The final status must be read only after the Simulate or Run call that reached the closed-stop endpoint returned successfully.',
        }),
      );
    }
  }
  if (
    absoluteStartOperandsSafe &&
    !unsafeTicNames.has('beganAtBiologicalTimeTics') &&
    beganAtBiologicalTimeTics > absoluteStartTics
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_WINDOW_INVALID',
        stage: 'science',
        instancePath: bufferTicsPath,
        validatorId: 'window.valid',
        message:
          'the most recent NEST recorder creation or n_events=0 clear occurred after originTics + startTics, so the retained buffer cannot substantiate the complete window.',
      }),
    );
  }
  if (
    absoluteStartOperandsSafe &&
    !unsafeTicNames.has('lastMutationAtBiologicalTimeTics') &&
    lastMutationAtBiologicalTimeTics > absoluteStartTics
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_WINDOW_INVALID',
        stage: 'science',
        instancePath: mutationTicsPath,
        validatorId: 'window.valid',
        message:
          'the most recent NEST recorder-window, backend, time-encoding, or sender-wiring mutation occurred after originTics + startTics, so one plan did not govern the complete window.',
      }),
    );
  }

  // Absolute endpoint derivation owns more prerequisites than exact chronology:
  // both scale declarations, every retained primitive projection, and the grid
  // must be admissible before Cortexel can interpret event membership or probe
  // adjacent binary64 clock points.
  let endpointSourceValid =
    finiteTimeLimitTics !== undefined &&
    !gridInvalid &&
    !sourceInvalidNames.has('ticsPerMs') &&
    !sourceInvalidNames.has('resolutionTics') &&
    retainedProjections.size === retainedTics.length &&
    retainedTics.every(([name]) => !sourceInvalidNames.has(name));
  if (endpointSourceValid) {
    for (const [name, tics, instancePath, label] of [
      [
        'absoluteStartTics',
        absoluteStartTics,
        startTicsPath,
        'originTics + startTics',
      ],
      [
        'absoluteUpperTics',
        absoluteUpperTics,
        upperAuthorityPath,
        captureBounded
          ? 'captureBiologicalTimeTics'
          : 'originTics + stopTics',
      ],
    ] as const) {
      if (
        tics > maximumSafeTics ||
        tics >= finiteTimeLimitTics!
      ) {
        sourceFailure(
          name,
          instancePath,
          `${label} is outside executable mapping profile 5: it must be a safe integer strictly below the pinned finite-Time limit.`,
        );
        endpointSourceValid = false;
        continue;
      }
      const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
      if (!projection.ok) {
        sourceFailure(
          name,
          instancePath,
          `${label} is outside executable mapping profile 5: ${projection.message}`,
        );
        endpointSourceValid = false;
      }
    }
  }

  if (endpointSourceValid && exactIntervalOrdered === true) {
    const endpointProjection = projectNestWindowEndpointsV310({
      ticsPerMs,
      resolutionTics,
      retainedTics: retainedTics.map(([, tics]) => tics),
      lowerEndpointTics: absoluteStartTics,
      upperEndpointTics: absoluteUpperTics,
    });
    if (!endpointProjection.ok) {
      const sourceProfileFailure = endpointProjection.kind === 'source_profile';
      errors.push(
        makeError({
          code: sourceProfileFailure
            ? 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT'
            : endpointProjection.kind === 'window_order'
              ? 'SCIENCE_WINDOW_INVALID'
              : 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          stage: sourceProfileFailure ? 'provenance' : 'science',
          instancePath: upperAuthorityPath,
          validatorId: 'window.valid',
          message: `the pinned NEST 3.10.0 endpoint projection is not admissible: ${endpointProjection.message}`,
        }),
      );
    }
  }

  return errors;
};

/**
 * Events must lie within the declared observation window.
 *
 * General event windows explicitly select [start, stop), [start, stop], or
 * (start, stop]. A finite-stop NEST recording-device window retains the
 * simulator's native (origin + start, origin + stop] convention. A NEST device
 * configured with positive infinity instead ends this artifact's finite prefix
 * at the exact successful-return capture time: (origin + start, capture]. NEST
 * endpoints are added in integer tics and then projected with the pinned
 * `Time::get_ms()` binary64 operation sequence before comparison with exported
 * binary64 event times. Separately serialized origin/offset fields are never summed.
 *
 * Out-of-window events are reported with a COUNT, never silently dropped — a
 * disclosure on the figure then says how many were excluded. The semantic gate
 * accepts deliberate `exclude_and_disclose`; the renderer remains responsible
 * for retaining those observations in the table and omitting only their marks.
 */
export const eventsWithinWindow: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const window = asRecord(data.window);
  if (!window) return [];

  const nestKind = nestWindowKind(window);
  const nestWindow = nestKind !== undefined;
  const captureBounded = nestKind === 'positive_infinity_capture_bounded';
  if (nestWindow && nestSourceClockDeclarationErrors(context).length > 0) {
    // Do not derive event membership through a second path when the complete
    // source-clock declaration for the same request is already rejected.
    return [];
  }
  const origin = asNumber(window.origin);
  const start = asNumber(window.start);
  const upper = asNumber(captureBounded ? window.captureTime : window.stop);
  if (
    start === undefined ||
    upper === undefined ||
    (nestWindow && origin === undefined)
  ) {
    return [];
  }
  // `window.valid` owns this authoring error. Membership is undefined until a
  // real interval (and, for NEST, a renderable interval) exists, so do not emit
  // one misleading event error per invalid window.
  if (!nestWindow && !(upper > start)) return [];

  const eventTimes = asRecord(data.eventTimes);
  const times = asArray(eventTimes?.values);
  if (!times) return [];
  const eventUnit = legalKnownUnit(eventTimes);
  const windowUnit = asString(window.unit);
  if (
    !eventUnit ||
    !windowUnit ||
    !isKnownUnit(windowUnit) ||
    dimensionOf(windowUnit) !== 'time'
  ) return [];

  const lowerTerms = nestWindow
    ? [
        { value: origin!, unit: windowUnit },
        { value: start, unit: windowUnit },
      ]
    : [{ value: start, unit: windowUnit }];
  const upperTerms = captureBounded
    ? [{ value: upper, unit: windowUnit }]
    : nestWindow
      ? [
        { value: origin!, unit: windowUnit },
        { value: upper, unit: windowUnit },
      ]
      : [{ value: upper, unit: windowUnit }];
  const boundary = captureBounded
    ? '(origin+start,capture]'
    : nestWindow
      ? '(origin+start,origin+stop]'
      : asString(window.boundary);
  const openStart =
    boundary === '(start,stop]' ||
    boundary === '(origin+start,origin+stop]' ||
    boundary === '(origin+start,capture]';
  const closedStop =
    boundary === '[start,stop]' ||
    boundary === '(start,stop]' ||
    boundary === '(origin+start,origin+stop]' ||
    boundary === '(origin+start,capture]';

  const nestEndpoints = nestWindow
    ? projectNestEndpoints(window, captureBounded)
    : undefined;
  if (nestWindow && (!nestEndpoints || eventUnit !== 'ms' || windowUnit !== 'ms')) {
    // `window.valid` and `events.source_clock_declared` own malformed or
    // out-of-profile NEST authority. Membership cannot be inferred safely.
    return [];
  }

  let outside = 0;
  let firstIndex = -1;

  for (let i = 0; i < times.length; i++) {
    const time = asNumber(times[i]);
    if (time === undefined) continue;
    let beforeStart: boolean;
    let beyondStop: boolean;
    try {
      if (nestEndpoints) {
        beforeStart = openStart
          ? time <= nestEndpoints.lowerMs
          : time < nestEndpoints.lowerMs;
        beyondStop = closedStop
          ? time > nestEndpoints.upperMs
          : time >= nestEndpoints.upperMs;
      } else {
        // Generic windows retain exact registered-unit comparison without a
        // rounded intermediate conversion.
        const lowerComparedWithEvent = compareExactUnitSumToValue(
          lowerTerms,
          { value: time, unit: eventUnit },
        );
        const upperComparedWithEvent = compareExactUnitSumToValue(
          upperTerms,
          { value: time, unit: eventUnit },
        );
        beforeStart = openStart
          ? lowerComparedWithEvent >= 0
          : lowerComparedWithEvent > 0;
        beyondStop = closedStop
          ? upperComparedWithEvent < 0
          : upperComparedWithEvent <= 0;
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'event-time unit conversion failed';
      const numericResolution =
        message.includes('overflowed') || message.includes('underflowed');
      return [
        makeError({
          code: numericResolution
            ? 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
            : 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('data', 'eventTimes', 'values', i),
          validatorId: 'events.within_window',
          message: numericResolution
            ? `event ${i} cannot be converted from ${eventUnit} to ${windowUnit} without overflowing or underflowing finite binary64, so its window membership is not representable.`
            : `event times in ${eventUnit} cannot be compared with a window in ${windowUnit}: ${message}`,
        }),
      ];
    }
    if (beforeStart || beyondStop) {
      outside++;
      if (firstIndex < 0) firstIndex = i;
    }
  }

  if (outside === 0) return [];
  if (asString(getParameters(context).outOfWindowPolicy) === 'exclude_and_disclose') return [];

  const windowDescription = captureBounded
    ? `(origin ${origin} + start ${start}, capture ${upper}] ${windowUnit}`
    : nestWindow
      ? `(origin ${origin} + start ${start}, origin ${origin} + stop ${upper}] ${windowUnit}`
      : `${boundary ?? '[start,stop)'} with start ${start}, stop ${upper} ${windowUnit}`;

  return [
    makeError({
      code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
      stage: 'science',
      instancePath: pointer('data', 'eventTimes', 'values', firstIndex),
      validatorId: 'events.within_window',
      message: `${outside} of ${times.length} events fall outside the declared window ${windowDescription} under ${nestWindow ? 'the pinned NEST source-clock projection' : 'exact registered-unit comparison'} with the event clock in ${eventUnit}. Widen the window or choose exclude_and_disclose; Cortexel will not quietly ignore an observation you supplied.`,
    }),
  ];
};

/**
 * Bind each source-specific NEST clock declaration to executable mapping profile 5.
 * Finite-stop and positive-infinity windows retain distinct shapes, but share the
 * same corrected source-bound NEST 3.10.0 time projection. This is an
 * internal-consistency check, not an authenticity claim.
 */
function nestSourceClockDeclarationErrors(
  context: SemanticContext,
): CortexelError[] {
  const data = getData(context);
  const window = asRecord(data.window);
  if (!window) return [];
  const nestKind = nestWindowKind(window);
  if (nestKind === undefined) return [];

  const source = asRecord(context.request.source);
  const eventTimes = asRecord(data.eventTimes);
  const version = asString(source?.systemVersion);
  const digest = asString(source?.sourceDigest);
  const captureAuthority = asRecord(window.captureAuthority);
  const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
  const captureVersion = asString(runtimeStatus?.nestVersion);
  const checks: readonly {
    readonly valid: boolean;
    readonly path: readonly (string | number)[];
    readonly message: string;
  }[] = [
    {
      valid: asString(source?.kind) === 'simulation',
      path: ['source', 'kind'],
      message: 'a NEST origin-relative event clock requires source.kind = simulation.',
    },
    {
      valid: asString(source?.system) === 'NEST',
      path: ['source', 'system'],
      message: 'a NEST origin-relative event clock requires source.system = NEST exactly.',
    },
    {
      valid: version === '3.10.0',
      path: ['source', 'systemVersion'],
      message: 'executable mapping profile 5 admits only the exact pinned NEST 3.10.0 runtime declaration.',
    },
    {
      valid: captureVersion === version,
      path: ['data', 'window', 'captureAuthority', 'runtimeStatus', 'nestVersion'],
      message: 'the capture-authority runtime version must exactly equal source.systemVersion.',
    },
    {
      valid: asString(runtimeStatus?.timeBuildProfile) ===
        'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
      path: ['data', 'window', 'captureAuthority', 'runtimeStatus', 'timeBuildProfile'],
      message: 'mapping revision 5 admits only the caller-declared LP64/int64 NEST 3.10.0 binary64 roundTiesToEven, stored-operation, no-excess-precision time build profile. R049 must independently establish the runtime rounding mode and toolchain flags.',
    },
    {
      valid: digest !== undefined && /^sha256:[0-9a-f]{64}$/u.test(digest),
      path: ['source', 'sourceDigest'],
      message: 'the exported recorder object must be bound by a full lowercase sha256: sourceDigest.',
    },
    {
      valid: asString(window.recordingBackend) === 'memory',
      path: ['data', 'window', 'recordingBackend'],
      message: 'executable mapping profile 5 admits only the NEST memory recording backend.',
    },
    {
      valid: asString(window.timeEncoding) === 'native_binary64_ms',
      path: ['data', 'window', 'timeEncoding'],
      message: 'executable mapping profile 5 admits only native_binary64_ms (time_in_steps=false), not reconstructed step/offset clocks.',
    },
    {
      valid: asString(eventTimes?.unit) === 'ms',
      path: ['data', 'eventTimes', 'unit'],
      message: 'a NEST native-binary64 memory clock must retain its serialized event unit ms.',
    },
    {
      valid: asString(data.timeBase) === 'absolute_clock',
      path: ['data', 'timeBase'],
      message: 'a NEST origin-relative recorder clock is an absolute source clock and cannot be relabelled trial_relative.',
    },
  ];

  return checks
    .filter((check) => !check.valid)
    .map((check) =>
      makeError({
        code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        stage: 'provenance',
        instancePath: pointer(...check.path),
        validatorId: 'events.source_clock_declared',
        message: check.message,
      }),
    );
}

export const eventsSourceClockDeclared: SemanticValidator =
  nestSourceClockDeclarationErrors;

/**
 * The recorded-sender universe must be declared, and every event must come from it.
 *
 * This is the rule that stops the most common silent error in population figures.
 * The number of neurons that SPIKED is not the number of neurons that were RECORDED.
 * A neuron that stayed silent for the whole window was still recorded, and it still
 * belongs in the denominator. Inferring the denominator from the event list drops
 * exactly those neurons — so the reported rate comes out too HIGH, in the direction
 * that makes the result look more interesting. Cortexel refuses to infer it.
 */
export const eventsSenderUniverseDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const recorded = asArray(data.recordedSenderIds);
  const senders = asArray(data.eventSenderIds);

  // `prebinned` mode carries a count rather than a universe; nothing to check.
  if (recorded === undefined) return [];

  if (recorded.length === 0) {
    return [
      makeError({
        code: 'SCIENCE_POPULATION_UNIVERSE_REQUIRED',
        stage: 'science',
        instancePath: pointer('data', 'recordedSenderIds'),
        validatorId: 'events.sender_universe_declared',
        message:
          'the recorded-sender universe is empty. A per-neuron rate has no denominator without it, and Cortexel will not count the senders that happened to spike instead — a silent neuron is still a recorded neuron.',
      }),
    ];
  }

  if (!senders) return [];

  const universe = new Set(recorded.filter((id): id is string => typeof id === 'string'));
  return checkReferencesInUniverse(
    senders,
    universe,
    ['data', 'eventSenderIds'],
    'events.sender_universe_declared',
    'the declared recorded-sender universe',
  );
};

/**
 * The trial universe must be declared.
 *
 * Same failure, different axis: a trial in which nothing happened is still a trial.
 * Inferring the trial count from the maximum observed trial id silently drops the
 * empty ones, which shrinks the denominator and inflates every per-trial value.
 */
export const eventsTrialUniverseDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const declaredCount = asNumber(data.trialCount);
  const trialIds = asArray(data.trialIds);
  const eventTrialIds = asArray(data.eventTrialIds);

  if (declaredCount === undefined && trialIds === undefined) {
    if (eventTrialIds !== undefined) {
      return [
        makeError({
          code: 'SCIENCE_TRIAL_UNIVERSE_REQUIRED',
          stage: 'science',
          instancePath: pointer('data'),
          validatorId: 'events.trial_universe_declared',
          message:
            'events carry trial ids but no trial universe or count was declared. Cortexel does not infer the trial count from the observed ids: a trial with no events is still a trial, and omitting it inflates every per-trial value.',
        }),
      ];
    }
    return [];
  }

  if (trialIds !== undefined && eventTrialIds !== undefined) {
    const universe = new Set(trialIds.filter((id): id is string => typeof id === 'string'));
    return checkReferencesInUniverse(
      eventTrialIds,
      universe,
      ['data', 'eventTrialIds'],
      'events.trial_universe_declared',
      'the declared trial universe',
    );
  }

  return [];
};

export const rateDenominatorPositive: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const count = asNumber(data.recordedSenderCount);
  if (count === undefined) return [];

  if (!Number.isSafeInteger(count) || count < 1) {
    return [
      makeError({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('data', 'recordedSenderCount'),
        validatorId: 'rate.denominator_positive',
        message: `the recorded-sender count must be a positive safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`,
      }),
    ];
  }

  return [];
};

/**
 * When the caller supplies BOTH a raw count and a normalized rate, re-derive the
 * rate and check it.
 *
 * Cortexel recomputes rather than trusts. A supplied rate that does not follow from
 * the count and the denominator means one of the three is wrong, and drawing the
 * number you were handed would propagate that error into the figure, the table, and
 * the archive — with a digest attesting to it.
 */
export const rateVerifyNormalization: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const counts = asArray(data.counts);
  const rates = asArray(asRecord(data.rates)?.values);
  if (!counts || !rates) return [];

  const senderCount = asNumber(data.recordedSenderCount);
  const edges = asArray(asRecord(data.binEdges)?.edges);
  const edgeUnit = asString(asRecord(data.binEdges)?.unit);
  const rateUnit = asString(asRecord(data.rates)?.unit);
  const normalization = asString(parameters.normalization);

  if (
    senderCount === undefined ||
    !edges ||
    !edgeUnit ||
    !rateUnit ||
    !normalization
  ) return [];

  const errors: CortexelError[] = [];

  for (let i = 0; i < counts.length && i < rates.length; i++) {
    const count = asNumber(counts[i]);
    const rate = asNumber(rates[i]);
    const lo = asNumber(edges[i]);
    const hi = asNumber(edges[i + 1]);

    if (count === undefined || rate === undefined || lo === undefined || hi === undefined) continue;

    if (!Number.isSafeInteger(count) || count < 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_COUNT_NOT_INTEGER',
          stage: 'science',
          instancePath: pointer('data', 'counts', i),
          validatorId: 'rate.verify_normalization',
          message: `a bin count must be an exact non-negative safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`,
        }),
      );
      continue;
    }

    let expected: number;
    let rateHz: number;
    try {
      const integerFactor =
        normalization === 'mean_rate_per_recorded_sender' ? senderCount : 1;
      expected = divideExactIntegerByConvertedDifference(
        count,
        integerFactor,
        lo,
        hi,
        edgeUnit,
        's',
      );
      rateHz = convert(rate, rateUnit, 'Hz');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'numeric conversion failed';
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'rates', 'values', i),
          validatorId: 'rate.verify_normalization',
          message: `bin ${i}: the supplied rate cannot be verified from its count, bin endpoints, units, and denominator because the required exact binary64 derivation failed (${detail}). Cortexel refuses rather than trusting a pre-normalized value it could not re-derive.`,
        }),
      );
      continue;
    }

    const zeroClassMatches = (rateHz === 0) === (expected === 0);
    const signMatches =
      rateHz === 0 || expected === 0 || Math.sign(rateHz) === Math.sign(expected);
    const relativeMatch = binary64RelativeDifferenceWithinTolerance(
      rateHz,
      expected,
      NUMERIC_TOLERANCE.relative,
    );
    if (!zeroClassMatches || !signMatches || !relativeMatch) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'rates', 'values', i),
          validatorId: 'rate.verify_normalization',
          message: `bin ${i}: the supplied rate ${rate} ${rateUnit} (${rateHz} Hz) does not follow from its count. ${count} events over the exact converted interval [${lo}, ${hi}] ${edgeUnit}${normalization === 'mean_rate_per_recorded_sender' ? ` and ${senderCount} recorded senders` : ''} gives ${expected} Hz. Cortexel re-derives the rate rather than drawing the number it was handed.`,
        }),
      );
    }
  }

  return errors;
};

function histogramBinUnitIsIndividuallyLegal(
  context: SemanticContext,
  binUnit: string | undefined,
): binUnit is string {
  if (binUnit === undefined || !isKnownUnit(binUnit)) return false;
  if (
    context.skillId === 'network.delay_distribution' ||
    context.skillId === 'neuro.isi_distribution'
  ) return dimensionOf(binUnit) === 'time';
  if (context.skillId !== 'network.weight_distribution') return true;

  const data = getData(context);
  if (asString(data.mode) === 'prebinned') {
    const dimension = dimensionOf(binUnit);
    return dimension !== undefined && kindAcceptsDimension('synaptic_weight', dimension);
  }
  const connections = asRecord(data.connections);
  const weightUnit = legalKnownUnit(asRecord(connections?.weights));
  return weightUnit !== undefined && (
    weightUnit === binUnit || axesAreCompatible(weightUnit, binUnit)
  );
}

/**
 * Histogram normalization must be self-consistent.
 *
 * `count` must be exact integers. `probability` must sum to 1. `density` must
 * INTEGRATE to 1 — that is, sum(value x binWidth) = 1, not sum(value) = 1. The
 * difference between those two is the single most common histogram error there is,
 * and with unequal bin widths it is invisible in the picture.
 *
 * An EMPTY histogram normalizes to nothing at all — never to NaN, and never to a
 * fabricated flat distribution.
 */
export const histogramNormalizationConsistent: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const normalization = asString(parameters.normalization);
  if (!normalization) return [];

  const values = asArray(data.values) ?? asArray(asRecord(data.histogram)?.values);
  const valuesAtHistogram = asArray(asRecord(data.histogram)?.values) !== undefined;
  const edges =
    asArray(asRecord(data.binEdges)?.edges) ?? resolveBinEdges(asRecord(parameters.bins));
  const binUnit =
    asString(asRecord(data.binEdges)?.unit) ?? asString(asRecord(parameters.bins)?.unit);
  const legalBinUnit = histogramBinUnitIsIndividuallyLegal(context, binUnit)
    ? binUnit
    : undefined;
  const histogramUnit = asString(asRecord(data.histogram)?.unit);
  const legalHistogramUnit = legalKnownUnit(asRecord(data.histogram));
  const valuePath = valuesAtHistogram ? ['data', 'histogram', 'values'] as const : ['data', 'values'] as const;

  if (!values || !edges || values.length === 0) return [];
  if (edges.length !== values.length + 1) return [];

  const errors: CortexelError[] = [];

  if (normalization === 'count') {
    for (let i = 0; i < values.length; i++) {
      const value = asNumber(values[i]);
      if (value === undefined) continue;
      if (!Number.isSafeInteger(value) || value < 0) {
        errors.push(
          makeError({
            code: 'SCIENCE_COUNT_NOT_INTEGER',
            stage: 'science',
            instancePath: pointer(...valuePath, i),
            validatorId: 'histogram.normalization_consistent',
            message: `a count must be an exact non-negative integer; got ${value}.`,
          }),
        );
      }
    }
    return errors;
  }

  if (
    normalization === 'density' &&
    legalBinUnit !== undefined &&
    reciprocalUnit(legalBinUnit) !== undefined &&
    histogramUnit !== undefined &&
    legalHistogramUnit !== undefined &&
    reciprocalUnit(legalBinUnit) !== legalHistogramUnit
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'histogram', 'unit'),
        validatorId: 'histogram.normalization_consistent',
        message: `a density over bins in ${legalBinUnit} must use the registered reciprocal unit ${String(reciprocalUnit(legalBinUnit))}; got ${histogramUnit}.`,
      }),
    );
  }

  const probabilities: number[] = [];
  let exactIntegralUnits = 0n;
  let anyValue = false;

  for (let i = 0; i < values.length; i++) {
    const value = asNumber(values[i]);
    if (value === undefined) continue;
    anyValue = true;
    if (value < 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer(...valuePath, i),
          validatorId: 'histogram.normalization_consistent',
          message: `${normalization} values must be non-negative; got ${value}.`,
        }),
      );
      continue;
    }

    if (normalization === 'probability') {
      probabilities.push(value);
    } else {
      const lo = asNumber(edges[i]);
      const hi = asNumber(edges[i + 1]);
      if (lo === undefined || hi === undefined) return errors;
      // The density rule: value x width, not value. With unequal bins these differ,
      // and the resulting figure is wrong in a way no reader can see.
      const widthUnits =
        finiteBinary64ToMinSubnormalUnits(hi) - finiteBinary64ToMinSubnormalUnits(lo);
      exactIntegralUnits += finiteBinary64ToMinSubnormalUnits(value) * widthUnits;
    }
  }

  if (!anyValue) return errors;

  let total: number;
  try {
    total = normalization === 'probability'
      ? exactBinary64Sum(probabilities)
      : exactRationalToBinary64(exactIntegralUnits, 1n, -2148);
  } catch {
    errors.push(
      makeError({
        code: normalization === 'density'
          ? 'SCIENCE_DENSITY_DOES_NOT_INTEGRATE'
          : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        stage: 'science',
        instancePath: pointer(...valuePath),
        validatorId: 'histogram.normalization_consistent',
        message: `the ${normalization} total is outside the finite binary64 range and cannot be verified.`,
      }),
    );
    return errors;
  }

  // A tolerance loose enough for accumulated binary64 error over many bins, and
  // tight enough that a genuinely unnormalized histogram cannot slip through.
  if (Math.abs(total - 1) > 1e-6) {
    errors.push(
      makeError({
        code:
          normalization === 'density'
            ? 'SCIENCE_DENSITY_DOES_NOT_INTEGRATE'
            : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        stage: 'science',
        instancePath: pointer(...valuePath),
        validatorId: 'histogram.normalization_consistent',
        message:
          normalization === 'density'
            ? `a density must integrate to 1 over its bin widths, but sum(value x binWidth) = ${total}. Note that this is NOT the same as sum(value): with unequal bin widths the two differ, and only the integral is the density.`
            : `a probability histogram must sum to 1, but these values sum to ${total}.`,
      }),
    );
  }

  return errors;
};
