//#region src/core/semantics/nest-time.ts
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
function failure(kind, message) {
	return {
		ok: false,
		kind,
		message
	};
}
function sourceGetMillisecondsV310(tics, ticsPerMs) {
	const millisecondsPerTic = 1 / Number(ticsPerMs);
	return Number(tics) * millisecondsPerTic;
}
/** NEST `Time::compute_max()` for the admitted LP64 NEST 3.10.0 runtime. */
function nestFiniteTimeLimitTicsV310(resolutionTics) {
	if (resolutionTics <= 0n || resolutionTics > MAX_SAFE_TICS) return void 0;
	const marginLimited = NEST_TIC_T_MAX / NEST_TIME_INF_MARGIN;
	const limit = marginLimited - marginLimited % resolutionTics;
	return limit > 0n ? limit : void 0;
}
/**
* Reproduce NEST 3.10.0 `Time::get_ms()` and its non-negative `Time(ms)`
* inverse check using the same sequence of binary64 operations.
*/
function projectNestTicsToMillisecondsV310(tics, ticsPerMs) {
	if (tics < 0n || tics > MAX_SAFE_TICS || ticsPerMs <= 0n || ticsPerMs > MAX_SAFE_TICS) return failure("source_profile", "the admitted NEST 3.10.0 source-clock subset requires non-negative tics and positive ticsPerMs no larger than Number.MAX_SAFE_INTEGER.");
	const ticsPerMsNumber = Number(ticsPerMs);
	const milliseconds = sourceGetMillisecondsV310(tics, ticsPerMs);
	if (!Number.isFinite(milliseconds)) return failure("source_profile", "the NEST 3.10.0 get_ms binary64 projection is not finite.");
	const recoveredNumber = Math.trunc(milliseconds * ticsPerMsNumber + .5);
	if (!Number.isSafeInteger(recoveredNumber) || BigInt(recoveredNumber) !== tics) return failure("source_profile", "the NEST 3.10.0 get_ms projection does not recover the declared tic with the pinned non-negative Time(ms) inverse.");
	return {
		ok: true,
		milliseconds
	};
}
/**
* Validate the conservative finite-Time domain and project absolute endpoints.
* Adjacent resolution-grid values must remain distinguishable in binary64; an
* interval that aliases a neighboring NEST clock point is not renderable.
*/
function projectNestWindowEndpointsV310(input) {
	const finiteTimeLimitTics = nestFiniteTimeLimitTicsV310(input.resolutionTics);
	if (finiteTimeLimitTics === void 0 || input.ticsPerMs <= 0n || input.ticsPerMs > MAX_SAFE_TICS) return failure("source_profile", "the admitted NEST 3.10.0 source-clock subset requires positive safe-integer ticsPerMs and resolutionTics.");
	const operativeTics = [
		...input.retainedTics,
		input.lowerEndpointTics,
		input.upperEndpointTics
	];
	for (const tics of operativeTics) {
		if (tics < 0n) return failure("source_profile", "every retained and combined NEST Time value must be non-negative.");
		if (tics >= finiteTimeLimitTics) return failure("source_profile", "every operative NEST Time value must be strictly below the pinned finite-Time limit.");
		if (tics > MAX_SAFE_TICS) return failure("source_profile", "every retained and combined NEST Time value in executable mapping profile 5 must be no larger than Number.MAX_SAFE_INTEGER.");
		const projected = projectNestTicsToMillisecondsV310(tics, input.ticsPerMs);
		if (!projected.ok) return projected;
	}
	if (!(input.upperEndpointTics > input.lowerEndpointTics)) return failure("window_order", "the exact upper endpoint tic must be strictly greater than the exact lower endpoint tic.");
	const lower = projectNestTicsToMillisecondsV310(input.lowerEndpointTics, input.ticsPerMs);
	const upper = projectNestTicsToMillisecondsV310(input.upperEndpointTics, input.ticsPerMs);
	if (!lower.ok) return lower;
	if (!upper.ok) return upper;
	if (!(upper.milliseconds > lower.milliseconds)) return failure("numeric_resolution", "the ordered NEST endpoint tics alias or invert after the pinned get_ms binary64 projection.");
	for (const [label, tics, projected] of [[
		"lower",
		input.lowerEndpointTics,
		lower.milliseconds
	], [
		"upper",
		input.upperEndpointTics,
		upper.milliseconds
	]]) for (const neighbor of [tics >= input.resolutionTics ? tics - input.resolutionTics : void 0, tics + input.resolutionTics < finiteTimeLimitTics ? tics + input.resolutionTics : void 0]) {
		if (neighbor === void 0) continue;
		const neighborMilliseconds = sourceGetMillisecondsV310(neighbor, input.ticsPerMs);
		if (!Number.isFinite(neighborMilliseconds)) return failure("source_profile", `the ${label} endpoint's adjacent NEST resolution-grid value has a non-finite get_ms projection.`);
		if (Object.is(neighborMilliseconds, projected)) return failure("numeric_resolution", `the ${label} endpoint aliases its adjacent NEST resolution-grid value after the pinned get_ms binary64 projection.`);
	}
	return {
		ok: true,
		lowerMilliseconds: lower.milliseconds,
		upperMilliseconds: upper.milliseconds,
		finiteTimeLimitTics
	};
}

//#endregion
export { projectNestTicsToMillisecondsV310 as n, projectNestWindowEndpointsV310 as r, nestFiniteTimeLimitTicsV310 as t };
//# sourceMappingURL=nest-time-HlQKV_CS.js.map