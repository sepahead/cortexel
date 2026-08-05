const require_canonicalize = require('./canonicalize-CM-RPRQS.cjs');
const require_exact_binary64 = require('./exact-binary64-B9QJo1AS.cjs');
const require_errors = require('./errors-DaUwoa4p.cjs');
const require_registry = require('./registry-CCvLcMCj.cjs');

//#region src/core/units.ts
/**
* Units.
*
* A non-blank string is not a unit. `"ms"` and `"milliseconds"` and `""` are three
* different situations, and a library that treats them the same will eventually
* multiply something by 1000 when it should not have.
*
* Three rules, and the second one is the interesting one:
*
*   1. A conversion is legal only WITHIN a dimension. Cross-dimension conversion
*      is never attempted, so a voltage can never become a current.
*
*   2. An accepted ALIAS is rejected in a stable request rather than silently
*      converted. This looks unfriendly and is deliberate: a silent conversion
*      changes a number that the caller never sees change. The rejection carries a
*      machine-applicable repair, so the fix is one operation — but it is the
*      caller's operation, and it is recorded. Adapters and `cortexel migrate` may
*      convert aliases, because there the conversion IS the caller's intent.
*
*   3. A `simulator_defined` unit — a NEST weight, say — has no SI mapping and is
*      NEVER converted, compared, or pooled with anything, including another
*      simulator-defined unit. A NEST weight's physical meaning depends on the
*      synapse and neuron model: in one model it acts like a current, in another
*      like a conductance. Two such numbers are not comparable merely because both
*      are called "weight", and a histogram that pools them is a histogram of nothing.
*/
function isKnownUnit(code) {
	return typeof code === "string" && Object.prototype.hasOwnProperty.call(require_registry.UNITS, code);
}
function dimensionOf(code) {
	return typeof code === "string" && isKnownUnit(code) ? require_registry.UNITS[code].dimension : void 0;
}
/** Registry-owned SI/canonical code for a convertible unit's dimension. */
function canonicalUnitFor(code) {
	if (!isKnownUnit(code)) return void 0;
	const dimension = require_registry.UNITS[code].dimension;
	if (dimension === "simulator_defined") return void 0;
	return Object.keys(require_registry.UNITS).find((candidate) => require_registry.UNITS[candidate].dimension === dimension && require_registry.UNITS[candidate].toCanonical === 1);
}
/** The canonical code an alias means, or undefined when the string is not an alias. */
function resolveAlias(code) {
	if (typeof code !== "string") return void 0;
	if (isKnownUnit(code)) return void 0;
	return Object.prototype.hasOwnProperty.call(require_registry.UNIT_ALIASES, code) ? require_registry.UNIT_ALIASES[code] : void 0;
}
/** Whether a quantity kind may legally carry a unit of this dimension. */
function kindAcceptsDimension(kind, dimension) {
	if (typeof kind !== "string" || typeof dimension !== "string") return false;
	const allowed = require_registry.QUANTITY_KIND_DIMENSIONS[kind];
	return Array.isArray(allowed) && allowed.includes(dimension);
}
/** True only for contract-registered physical quantity discriminators. */
function isQuantityKind(kind) {
	return typeof kind === "string" && Object.prototype.hasOwnProperty.call(require_registry.QUANTITY_KIND_DIMENSIONS, kind);
}
function powerOfTen(exponent) {
	return 10n ** BigInt(exponent);
}
function exactUnitScale(unit) {
	const decimalExponent = unit.toCanonicalDecimalExponent;
	if (decimalExponent !== null) return decimalExponent >= 0 ? {
		numerator: powerOfTen(decimalExponent),
		denominator: 1n,
		binaryExponent: 0
	} : {
		numerator: 1n,
		denominator: powerOfTen(-decimalExponent),
		binaryExponent: 0
	};
	if (unit.toCanonical === null) throw new Error("simulator-defined unit has no exact conversion scale");
	return {
		numerator: require_exact_binary64.finiteBinary64ToMinSubnormalUnits(unit.toCanonical),
		denominator: 1n,
		binaryExponent: -1074
	};
}
function exactScaleRatio(from, to) {
	const source = exactUnitScale(from);
	const target = exactUnitScale(to);
	return {
		numerator: source.numerator * target.denominator,
		denominator: source.denominator * target.numerator,
		binaryExponent: source.binaryExponent - target.binaryExponent
	};
}
function multiplyExactScales(left, right) {
	return {
		numerator: left.numerator * right.numerator,
		denominator: left.denominator * right.denominator,
		binaryExponent: left.binaryExponent + right.binaryExponent
	};
}
function exactQuantityRational(value, unitCode) {
	if (!Number.isFinite(value) || !isKnownUnit(unitCode)) throw new Error("exact unit comparison requires finite values and registered units");
	const unit = require_registry.UNITS[unitCode];
	if (unit.toCanonical === null) throw new Error("exact unit comparison is unavailable for simulator-defined units");
	const scale = exactUnitScale(unit);
	return {
		numerator: require_exact_binary64.finiteBinary64ToMinSubnormalUnits(value) * scale.numerator,
		denominator: scale.denominator,
		binaryExponent: scale.binaryExponent - 1074
	};
}
function addExactRationals(left, right) {
	const exponent = Math.min(left.binaryExponent, right.binaryExponent);
	return {
		numerator: (left.numerator * right.denominator << BigInt(left.binaryExponent - exponent)) + (right.numerator * left.denominator << BigInt(right.binaryExponent - exponent)),
		denominator: left.denominator * right.denominator,
		binaryExponent: exponent
	};
}
function compareExactRationals(left, right) {
	const exponent = Math.min(left.binaryExponent, right.binaryExponent);
	const leftInteger = left.numerator * right.denominator << BigInt(left.binaryExponent - exponent);
	const rightInteger = right.numerator * left.denominator << BigInt(right.binaryExponent - exponent);
	return leftInteger < rightInteger ? -1 : leftInteger > rightInteger ? 1 : 0;
}
/**
* Compare an exact sum of registered physical quantities with a target quantity.
* No unit factor or intermediate sum is rounded. All units must share one dimension.
*/
function compareExactUnitSumToValue(terms, target) {
	if (terms.length === 0) throw new Error("exact unit sum comparison requires at least one term");
	const targetDimension = dimensionOf(target.unit);
	if (!targetDimension || targetDimension === "simulator_defined") throw new Error("exact unit sum comparison requires a registered physical target unit");
	let sum = {
		numerator: 0n,
		denominator: 1n,
		binaryExponent: 0
	};
	for (const term of terms) {
		if (dimensionOf(term.unit) !== targetDimension) throw new Error("exact unit sum comparison refuses cross-dimension terms");
		sum = addExactRationals(sum, exactQuantityRational(term.value, term.unit));
	}
	return compareExactRationals(sum, exactQuantityRational(target.value, target.unit));
}
/**
* Compare a large same-unit array sum with an exact cross-unit endpoint difference.
*
* Unlike the general small-term helper above, this keeps the common denominator once:
* every finite binary64 input is first accumulated as its integer coefficient of 2^-1074,
* then the registered unit scale is applied once. Complexity is linear in the number of
* values and intermediate integer size stays bounded by the exact sum, so a recorder-sized
* train cannot cause denominator multiplication on every term.
*/
function compareExactUnitArraySumToDifference(values, valueUnit, lower, upper) {
	const dimension = dimensionOf(valueUnit);
	if (!dimension || dimension === "simulator_defined") throw new Error("exact unit array comparison requires a registered physical value unit");
	if (dimensionOf(lower.unit) !== dimension || dimensionOf(upper.unit) !== dimension) throw new Error("exact unit array comparison refuses cross-dimension endpoints");
	const unit = require_registry.UNITS[valueUnit];
	if (!unit || unit.toCanonical === null) throw new Error("exact unit array comparison requires a physical unit scale");
	let sumUnits = 0n;
	for (const value of values) sumUnits += require_exact_binary64.finiteBinary64ToMinSubnormalUnits(value);
	const scale = exactUnitScale(unit);
	const sum = {
		numerator: sumUnits * scale.numerator,
		denominator: scale.denominator,
		binaryExponent: scale.binaryExponent - 1074
	};
	const lowerRational = exactQuantityRational(lower.value, lower.unit);
	return compareExactRationals(sum, addExactRationals(exactQuantityRational(upper.value, upper.unit), {
		...lowerRational,
		numerator: -lowerRational.numerator
	}));
}
/** Correctly round an exact sum of registered quantities into one target unit. */
function convertExactUnitSum(terms, targetUnit) {
	if (terms.length === 0) throw new Error("exact unit sum conversion requires at least one term");
	const targetDimension = dimensionOf(targetUnit);
	if (!targetDimension || targetDimension === "simulator_defined") throw new Error("exact unit sum conversion requires a registered physical target unit");
	let sum = {
		numerator: 0n,
		denominator: 1n,
		binaryExponent: 0
	};
	for (const term of terms) {
		if (dimensionOf(term.unit) !== targetDimension) throw new Error("exact unit sum conversion refuses cross-dimension terms");
		sum = addExactRationals(sum, exactQuantityRational(term.value, term.unit));
	}
	const targetScale = exactUnitScale(require_registry.UNITS[targetUnit]);
	try {
		const converted = require_exact_binary64.exactRationalToBinary64(sum.numerator * targetScale.denominator, sum.denominator * targetScale.numerator, sum.binaryExponent - targetScale.binaryExponent);
		if (sum.numerator !== 0n && converted === 0) throw new Error("exact unit sum conversion underflowed binary64");
		return converted;
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact unit sum conversion overflowed binary64");
		throw error;
	}
}
function conversionScaleRatio(from, to) {
	if (typeof from !== "string" || typeof to !== "string") throw new Error("conversion factor requires two registered unit codes");
	const fromUnit = require_registry.UNITS[from];
	const toUnit = require_registry.UNITS[to];
	if (!fromUnit || !toUnit || fromUnit.toCanonical === null || toUnit.toCanonical === null) throw new Error(`no conversion factor exists for ${from} -> ${to}`);
	if (fromUnit.dimension !== toUnit.dimension) throw new Error(`no conversion factor exists across dimensions: ${from} (${fromUnit.dimension}) -> ${to} (${toUnit.dimension})`);
	return from === to ? {
		numerator: 1n,
		denominator: 1n,
		binaryExponent: 0
	} : exactScaleRatio(fromUnit, toUnit);
}
/**
* Convert a value between two codes of the same dimension.
*
* Multiplies ONCE, by a single exact factor. It never chains through an
* intermediate unit, because every extra binary64 multiply is another chance to
* lose a digit for no reason.
*/
function convert(value, from, to) {
	if (!Number.isFinite(value) || typeof from !== "string" || typeof to !== "string") throw new Error("conversion requires a finite value and two registered unit codes");
	const fromUnit = require_registry.UNITS[from];
	const toUnit = require_registry.UNITS[to];
	if (!fromUnit || !toUnit) throw new Error(`unknown unit in conversion: ${from} -> ${to}`);
	if (fromUnit.dimension !== toUnit.dimension) throw new Error(`refusing to convert across dimensions: ${from} (${fromUnit.dimension}) -> ${to} (${toUnit.dimension})`);
	if (fromUnit.toCanonical === null || toUnit.toCanonical === null) throw new Error(`refusing to convert a simulator-defined unit: ${from} -> ${to}. Its physical meaning depends on the source model and has no SI mapping.`);
	if (from === to) return value;
	const ratio = exactScaleRatio(fromUnit, toUnit);
	let converted;
	try {
		converted = require_exact_binary64.exactBinary64MultiplyByRational(value, ratio.numerator, ratio.denominator, ratio.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("unit conversion overflowed binary64");
		throw error;
	}
	if (!Number.isFinite(converted) || value !== 0 && converted === 0) throw new Error("unit conversion overflowed or underflowed binary64");
	return converted;
}
/** The single factor a conversion would apply, for the derivation receipt. */
function conversionFactor(from, to) {
	const ratio = conversionScaleRatio(from, to);
	return require_exact_binary64.exactRationalToBinary64(ratio.numerator, ratio.denominator, ratio.binaryExponent);
}
/** Complete reproducible authority for one registered unit conversion. */
function conversionReceipt(from, to) {
	const ratio = conversionScaleRatio(from, to);
	return {
		from,
		to,
		factor: require_exact_binary64.exactRationalToBinary64(ratio.numerator, ratio.denominator, ratio.binaryExponent),
		exactFactor: {
			numerator: ratio.numerator.toString(10),
			denominator: ratio.denominator.toString(10),
			binaryExponent: ratio.binaryExponent
		},
		algorithm: "exact_rational_round_to_binary64"
	};
}
/**
* Reproducible authority for converting a derivative whose state and reciprocal-time
* units are carried separately by the phase-plane contract.
*
* The two registered factors remain exact until their product is rounded for the
* informational `factor`; replay uses `exactFactor`, never that rounded number.
*/
function compositeDerivativeConversionReceipt(stateFrom, stateTo, derivativeFrom, derivativeTo) {
	const composite = multiplyExactScales(conversionScaleRatio(stateFrom, stateTo), conversionScaleRatio(derivativeFrom, derivativeTo));
	return {
		stateUnitConversion: conversionReceipt(stateFrom, stateTo),
		derivativeUnitConversion: conversionReceipt(derivativeFrom, derivativeTo),
		factor: require_exact_binary64.exactRationalToBinary64(composite.numerator, composite.denominator, composite.binaryExponent),
		exactFactor: {
			numerator: composite.numerator.toString(10),
			denominator: composite.denominator.toString(10),
			binaryExponent: composite.binaryExponent
		},
		algorithm: "exact_composite_derivative_round_to_binary64"
	};
}
/**
* Convert one derivative component by composing its state-unit and reciprocal-time
* factors as one exact rational, then rounding the final component once.
*/
function convertCompositeDerivative(value, stateFrom, stateTo, derivativeFrom, derivativeTo) {
	if (!Number.isFinite(value)) throw new Error("composite derivative conversion requires a finite value");
	const composite = multiplyExactScales(conversionScaleRatio(stateFrom, stateTo), conversionScaleRatio(derivativeFrom, derivativeTo));
	let converted;
	try {
		converted = require_exact_binary64.exactBinary64MultiplyByRational(value, composite.numerator, composite.denominator, composite.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("composite derivative conversion overflowed binary64");
		throw error;
	}
	if (!Number.isFinite(converted) || value !== 0 && converted === 0) throw new Error("composite derivative conversion overflowed or underflowed binary64");
	return converted;
}
/** Reproducible authority for the unit factor inside one axis-normalized component. */
function axisNormalizedDerivativeConversionReceipt(derivativeFrom, derivativeTo) {
	return {
		derivativeUnitConversion: conversionReceipt(derivativeFrom, derivativeTo),
		algorithm: "exact_derivative_unit_factor_over_exact_binary64_extent_round_to_binary64"
	};
}
/**
* Correctly round
*
*   value * exactConvert(derivativeFrom -> derivativeTo) / (maximum - minimum)
*
* without first rounding either the unit conversion or the finite endpoint
* difference. The inherited state unit cancels against its own axis extent.
*/
function normalizeDerivativeByExactAxisExtent(value, derivativeFrom, derivativeTo, minimum, maximum) {
	if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || !(maximum > minimum)) throw new Error("axis-normalized derivative conversion requires a finite value and ordered extent");
	const ratio = conversionScaleRatio(derivativeFrom, derivativeTo);
	const valueUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(value);
	const extentUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(maximum) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(minimum);
	let normalized;
	try {
		normalized = require_exact_binary64.exactRationalToBinary64(valueUnits * ratio.numerator, extentUnits * ratio.denominator, ratio.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("axis-normalized derivative conversion overflowed binary64");
		throw error;
	}
	if (!Number.isFinite(normalized) || value !== 0 && normalized === 0) throw new Error("axis-normalized derivative conversion overflowed or underflowed binary64");
	return Object.is(normalized, -0) ? 0 : normalized;
}
/** Correctly round the exact converted separation `upper - lower` without subtracting first. */
function convertDifference(lower, upper, from, to) {
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) throw new Error("converted difference requires finite strictly ordered endpoints");
	const ratio = conversionScaleRatio(from, to);
	const differenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lower);
	try {
		return require_exact_binary64.exactRationalToBinary64(differenceUnits * ratio.numerator, ratio.denominator, ratio.binaryExponent - 1074);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("unit-converted difference overflowed binary64");
		throw error;
	}
}
/**
* Correctly round
* `numerator / (integerFactor * exactConvert(upper - lower, from, to))`
* without materializing or rounding the converted difference first.
*
* This is the authoritative rate/density denominator path for exact integer
* observations over endpoint-defined intervals. Both endpoint subtraction and unit
* conversion remain rational until the final quotient is rounded once.
*/
function divideExactIntegerByConvertedDifference(numerator, integerFactor, lower, upper, from, to) {
	if (!Number.isSafeInteger(numerator) || numerator < 0) throw new Error("exact endpoint quotient requires a non-negative safe-integer numerator");
	if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) throw new Error("exact endpoint quotient requires a positive safe-integer factor");
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) throw new Error("exact endpoint quotient requires finite strictly ordered endpoints");
	const ratio = conversionScaleRatio(from, to);
	const differenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lower);
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(BigInt(numerator) * ratio.denominator, BigInt(integerFactor) * differenceUnits * ratio.numerator, 1074 - ratio.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact endpoint quotient overflowed binary64");
		throw error;
	}
	if (numerator !== 0 && result === 0) throw new Error("exact endpoint quotient underflowed binary64");
	return result;
}
/**
* Correctly round an exact count rate directly into a declared frequency unit.
*
* Unlike deriving Hz and then converting, this combines the endpoint difference, time-unit
* scale, sender/trial denominator, and output-frequency scale into one rational and rounds
* once. It is the authoritative predicate for a caller-supplied rate audit.
*/
function deriveExactCountRateInUnit(count, integerFactor, lower, upper, timeUnit, rateUnit) {
	if (!Number.isSafeInteger(count) || count < 0) throw new Error("exact count rate requires a non-negative safe-integer count");
	if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) throw new Error("exact count rate requires a positive safe-integer denominator");
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) throw new Error("exact count rate requires finite strictly ordered endpoints");
	const timeToSeconds = conversionScaleRatio(timeUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	const differenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lower);
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(BigInt(count) * timeToSeconds.denominator * rateToHz.denominator, BigInt(integerFactor) * differenceUnits * timeToSeconds.numerator * rateToHz.numerator, 1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact count rate overflowed binary64");
		throw error;
	}
	if (count !== 0 && result === 0) throw new Error("exact count rate underflowed binary64");
	return result;
}
/**
* Correctly round an exact count rate with more than one integer denominator.
*
* A PSTH rate may divide by both the number of covering trials and the number of
* selected senders.  Multiplying those denominators as a JavaScript number first
* would make the result depend on whether their product still happens to be a safe
* integer.  Keep the product in BigInt and combine it with the endpoint difference,
* time conversion, and output-rate conversion before the single binary64 rounding.
*/
function deriveExactCountRateWithIntegerFactorsInUnit(count, integerFactors, lower, upper, timeUnit, rateUnit) {
	if (!Number.isSafeInteger(count) || count < 0) throw new Error("exact count rate requires a non-negative safe-integer count");
	if (integerFactors.length < 1 || integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)) throw new Error("exact count rate requires positive safe-integer factors");
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) throw new Error("exact count rate requires finite strictly ordered endpoints");
	const timeToSeconds = conversionScaleRatio(timeUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	const differenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lower);
	const integerFactor = integerFactors.reduce((product, factor) => product * BigInt(factor), 1n);
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(BigInt(count) * timeToSeconds.denominator * rateToHz.denominator, integerFactor * differenceUnits * timeToSeconds.numerator * rateToHz.numerator, 1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact count rate overflowed binary64");
		throw error;
	}
	if (count !== 0 && result === 0) throw new Error("exact count rate underflowed binary64");
	return result;
}
/**
* Correctly round one aggregate count over a sum of exact, integer-weighted
* endpoint exposures.
*
* This is the PSTH baseline authority.  The denominator is
*
*   sum_i(coveringTrials_i * (upper_i - lower_i)) * other integer factors
*
* in a registered time unit.  No bin width, exposure, unit factor, or partial sum
* is rounded before the final rate is rounded into `rateUnit`.
*/
function deriveExactAggregateCountRateOverIntervalsInUnit(countTotal, integerFactors, intervals, timeUnit, rateUnit) {
	if (countTotal < 0n) throw new Error("exact aggregate count rate requires a non-negative count total");
	if (integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)) throw new Error("exact aggregate count rate requires positive safe-integer factors");
	if (intervals.length < 1) throw new Error("exact aggregate count rate requires positive observed exposure");
	let weightedDifferenceUnits = 0n;
	for (const interval of intervals) {
		if (!Number.isFinite(interval.lower) || !Number.isFinite(interval.upper) || !(interval.upper > interval.lower) || !Number.isSafeInteger(interval.integerWeight) || interval.integerWeight < 1) throw new Error("exact aggregate count rate requires ordered finite intervals with positive safe-integer weights");
		const differenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(interval.upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(interval.lower);
		weightedDifferenceUnits += BigInt(interval.integerWeight) * differenceUnits;
	}
	if (weightedDifferenceUnits <= 0n) throw new Error("exact aggregate count rate requires positive observed exposure");
	const timeToSeconds = conversionScaleRatio(timeUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	const integerFactor = integerFactors.reduce((product, factor) => product * BigInt(factor), 1n);
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(countTotal * timeToSeconds.denominator * rateToHz.denominator, integerFactor * weightedDifferenceUnits * timeToSeconds.numerator * rateToHz.numerator, 1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact aggregate count rate overflowed binary64");
		throw error;
	}
	if (countTotal !== 0n && result === 0) throw new Error("exact aggregate count rate underflowed binary64");
	return result;
}
/**
* Correctly round the signed difference between one exact count rate and one
* aggregate exact count rate.
*
* Both rates share the same typed time and output-frequency scales, but their
* count and exposure fractions generally have different denominators.  Rounding
* each rate before subtraction can turn a one-event difference into a different
* displayed value at large counts.  Cross-multiply the two exact fractions and
* round only the signed result.
*/
function deriveExactCountRateMinusAggregateRateOverIntervalsInUnit(count, integerFactors, lower, upper, aggregateCount, aggregateIntegerFactors, intervals, timeUnit, rateUnit) {
	if (!Number.isSafeInteger(count) || count < 0 || aggregateCount < 0n) throw new Error("exact rate difference requires non-negative exact counts");
	if (integerFactors.length < 1 || integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1) || aggregateIntegerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)) throw new Error("exact rate difference requires positive safe-integer factors");
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) throw new Error("exact rate difference requires finite strictly ordered endpoints");
	const binDifferenceUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lower);
	const binIntegerFactor = integerFactors.reduce((product, factor) => product * BigInt(factor), 1n);
	let aggregateDifferenceUnits = 0n;
	for (const interval of intervals) {
		if (!Number.isFinite(interval.lower) || !Number.isFinite(interval.upper) || !(interval.upper > interval.lower) || !Number.isSafeInteger(interval.integerWeight) || interval.integerWeight < 1) throw new Error("exact rate difference requires ordered finite aggregate intervals with positive safe-integer weights");
		aggregateDifferenceUnits += BigInt(interval.integerWeight) * (require_exact_binary64.finiteBinary64ToMinSubnormalUnits(interval.upper) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(interval.lower));
	}
	if (aggregateDifferenceUnits <= 0n) throw new Error("exact rate difference requires positive aggregate exposure");
	const aggregateIntegerFactor = aggregateIntegerFactors.reduce((product, factor) => product * BigInt(factor), 1n);
	const signedFractionNumerator = BigInt(count) * aggregateIntegerFactor * aggregateDifferenceUnits - aggregateCount * binIntegerFactor * binDifferenceUnits;
	const fractionDenominator = binIntegerFactor * binDifferenceUnits * aggregateIntegerFactor * aggregateDifferenceUnits;
	const timeToSeconds = conversionScaleRatio(timeUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(signedFractionNumerator * timeToSeconds.denominator * rateToHz.denominator, fractionDenominator * timeToSeconds.numerator * rateToHz.numerator, 1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact rate difference overflowed binary64");
		throw error;
	}
	if (signedFractionNumerator !== 0n && result === 0) throw new Error("exact rate difference underflowed binary64");
	return result;
}
function floorNonnegativeRationalWithBinaryExponent(numerator, denominator, binaryExponent) {
	if (numerator < 0n || denominator <= 0n) throw new Error("exact rational floor requires a non-negative numerator and positive denominator");
	return binaryExponent >= 0 ? (numerator << BigInt(binaryExponent)) / denominator : numerator / (denominator << BigInt(-binaryExponent));
}
/**
* Correctly round an exact aggregate of integer counts through one duration denominator.
*
* `countTotal / estimatorDenominator` is the count-level mean, trimmed mean, or
* even-median midpoint. The division by the rate-normalization factor, typed duration,
* and declared frequency-unit scale is combined with that estimator denominator into a
* single rational and rounded exactly once. The integer total may exceed MAX_SAFE_INTEGER
* but cannot exceed the sum of `estimatorDenominator` safe-integer observations.
*/
function deriveExactAggregateCountRateInUnit(countTotal, integerFactor, estimatorDenominator, durationValue, durationUnit, rateUnit) {
	if (countTotal < 0n || !Number.isSafeInteger(integerFactor) || integerFactor < 1 || !Number.isSafeInteger(estimatorDenominator) || estimatorDenominator < 1 || countTotal > BigInt(estimatorDenominator) * BigInt(Number.MAX_SAFE_INTEGER) || !Number.isFinite(durationValue) || !(durationValue > 0) || dimensionOf(durationUnit) !== "time" || dimensionOf(rateUnit) !== "frequency") throw new Error("exact aggregate count rate requires a bounded non-negative integer total, positive exact denominators, a positive typed duration, and a registered frequency unit");
	const durationUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(durationValue);
	const timeToSeconds = conversionScaleRatio(durationUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	let result;
	try {
		result = require_exact_binary64.exactRationalToBinary64(countTotal * timeToSeconds.denominator * rateToHz.denominator, BigInt(integerFactor) * BigInt(estimatorDenominator) * durationUnits * timeToSeconds.numerator * rateToHz.numerator, 1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent);
	} catch (error) {
		if (error instanceof Error && error.message.includes("overflows")) throw new Error("exact aggregate count rate overflowed binary64");
		throw error;
	}
	if (countTotal !== 0n && result === 0) throw new Error("exact aggregate count rate underflowed binary64");
	return result;
}
/**
* Whether a supplied rate can be the correctly rounded aggregate of exact integer counts.
*
* Each underlying observation has the form `count / (integerFactor * duration)`.
* `estimatorDenominator` is 1 for a raw observation or odd-sample median, 2 for an
* even-sample median, and the retained sample count for a mean or trimmed mean. The
* unknown integer total is bounded by `estimatorDenominator * MAX_SAFE_INTEGER`.
*
* The submitted binary64 rate, duration, and registered unit scales are inverted as one
* exact rational. Only the floor and ceiling integer totals can lie in that value's
* contiguous round-to-nearest interval. The nearest integers on either side of the
* inverse point are tested, together with the finite observation-domain boundary: the
* rounded value of the maximum allowed total may have an inverse center just above that
* boundary. Every candidate is forward-rounded through the same one-round count-rate
* formula. No duration, denominator product, or unit conversion is first materialized
* in binary64.
*/
function isRoundedAggregateCountRateInUnit(value, integerFactor, estimatorDenominator, durationValue, durationUnit, rateUnit) {
	if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(integerFactor) || integerFactor < 1 || !Number.isSafeInteger(estimatorDenominator) || estimatorDenominator < 1 || !Number.isFinite(durationValue) || !(durationValue > 0) || dimensionOf(durationUnit) !== "time" || dimensionOf(rateUnit) !== "frequency") return false;
	const canonicalValue = value === 0 ? 0 : value;
	const valueUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(canonicalValue);
	const durationUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(durationValue);
	const timeToSeconds = conversionScaleRatio(durationUnit, "s");
	const rateToHz = conversionScaleRatio(rateUnit, "Hz");
	const floorTotal = floorNonnegativeRationalWithBinaryExponent(valueUnits * (BigInt(integerFactor) * BigInt(estimatorDenominator)) * durationUnits * timeToSeconds.numerator * rateToHz.numerator, timeToSeconds.denominator * rateToHz.denominator, -2148 + timeToSeconds.binaryExponent + rateToHz.binaryExponent);
	const maximumTotal = BigInt(estimatorDenominator) * BigInt(Number.MAX_SAFE_INTEGER);
	for (const total of /* @__PURE__ */ new Set([
		floorTotal,
		floorTotal + 1n,
		maximumTotal
	])) {
		if (total < 0n || total > maximumTotal) continue;
		let rounded;
		try {
			rounded = deriveExactAggregateCountRateInUnit(total, integerFactor, estimatorDenominator, durationValue, durationUnit, rateUnit);
		} catch {
			continue;
		}
		if (rounded === canonicalValue) return true;
	}
	return false;
}
/** Convert a duration to seconds. Used wherever a rate denominator is formed. */
function toSeconds(value, unit) {
	const dimension = dimensionOf(unit);
	if (dimension !== "time") throw new Error(`${unit} is not a time unit (${String(dimension)})`);
	return convert(value, unit, "s");
}
/**
* Validate one quantity's unit and kind.
*
* Returns diagnostics rather than throwing, so a request with several unit
* problems reports all of them at once instead of one per round trip.
*/
function checkQuantityUnit(kind, unit, path, validatorId) {
	const errors = [];
	const at = require_errors.pointer(...path);
	if (!isKnownUnit(unit)) {
		const canonical = resolveAlias(unit);
		if (canonical !== void 0) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
				stage: "science",
				instancePath: at,
				validatorId: "unit.canonical_code",
				message: `"${unit}" is an accepted alias, not a canonical code. Use "${canonical}". It is not converted silently: a conversion that changes a number without the caller seeing it is exactly the kind of quiet edit this contract exists to prevent.`,
				repair: {
					operation: "replace",
					path: at,
					value: canonical,
					reasonCode: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"
				}
			}));
			return errors;
		}
		errors.push(require_errors.makeError({
			code: "SCHEMA_ENUM_MISMATCH",
			stage: "structural",
			instancePath: at,
			validatorId,
			message: `"${unit}" is not a unit code in the registry.`
		}));
		return errors;
	}
	const dimension = require_registry.UNITS[unit].dimension;
	if (!kindAcceptsDimension(kind, dimension)) {
		const allowed = require_registry.QUANTITY_KIND_DIMENSIONS[kind] ?? [];
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: at,
			validatorId: "unit.dimension_match",
			message: `a quantity of kind "${kind}" cannot carry the unit "${unit}" (dimension ${dimension}); it accepts ${allowed.length > 0 ? allowed.join(", ") : "no dimension"}.`
		}));
	}
	return errors;
}
/**
* Whether two quantities may share one numeric axis.
*
* Equal array length is not a reason to put two signals on the same axis. A calcium
* concentration and a membrane potential are both "numbers over time" and mean
* entirely different things; overlaying them produces a picture that looks like a
* comparison and is not one.
*/
function axesAreCompatible(unitA, unitB) {
	if (typeof unitA !== "string" || typeof unitB !== "string") return false;
	const a = dimensionOf(unitA);
	const b = dimensionOf(unitB);
	if (a === void 0 || b === void 0) return false;
	if (a === "simulator_defined" || b === "simulator_defined") return false;
	return a === b;
}
/** The display label for a unit ("" for the dimensionless unit). */
function unitLabel(code) {
	return typeof code === "string" && isKnownUnit(code) ? require_registry.UNITS[code].label : "";
}
/**
* The reciprocal unit a density over this axis must carry.
*
* A density is not dimensionless: an ISI density binned in milliseconds has the
* unit ms^-1, and labelling it "probability" would overstate what it is.
*/
function reciprocalUnit(code) {
	if (typeof code !== "string") return void 0;
	const reciprocal = `/${code}`;
	return isKnownUnit(reciprocal) ? reciprocal : void 0;
}

//#endregion
//#region src/core/binning.ts
/** Shared, bounded width-bin materialization used by semantics and analysis. */
/** Matches the contract's maximum of 100001 explicit edges. */
const MAX_MATERIALIZED_BINS = 1e5;
/**
* Implement `cortexel_binary64_nominal_interval_candidates_v1` from the normative
* `contract/registries/numeric-policies.v1.json` registry.
*
* Materialize `[start, stop]` into at most 100000 bins without throwing.
*
* Every edge is checked, not only the first: binary64 spacing can change while a range
* crosses a power-of-two boundary, so a width representable at the origin may collapse
* later. The final edge is exactly `stop`, and a genuine nominal remainder is rejected.
* This algorithm deliberately makes no equal-exposure claim: emitted endpoint pairs are
* authoritative and can differ from the nominal width. A rate-bearing consumer must add
* the uniform-exposure policy's exact physical-unit postcondition before dividing by the
* typed width.
*/
function materializeWidthBins(start, stop, width) {
	if (typeof start !== "number" || typeof stop !== "number" || typeof width !== "number") return {
		ok: false,
		reason: "nonfinite"
	};
	if (![
		start,
		stop,
		width
	].every(Number.isFinite)) return {
		ok: false,
		reason: "nonfinite"
	};
	if (!(width > 0) || !(stop > start)) return {
		ok: false,
		reason: "invalid_range"
	};
	const exactIntegerInputs = Number.isSafeInteger(start) && Number.isSafeInteger(stop) && Number.isSafeInteger(width);
	const coefficientExponent = exactIntegerInputs ? 0 : -1074;
	const startUnits = exactIntegerInputs ? BigInt(start) : require_exact_binary64.finiteBinary64ToMinSubnormalUnits(start);
	const stopUnits = exactIntegerInputs ? BigInt(stop) : require_exact_binary64.finiteBinary64ToMinSubnormalUnits(stop);
	const widthUnits = exactIntegerInputs ? BigInt(width) : require_exact_binary64.finiteBinary64ToMinSubnormalUnits(width);
	const emittedStart = start === 0 ? 0 : start;
	const emittedStop = stop === 0 ? 0 : stop;
	const spanUnits = stopUnits - startUnits;
	let ratio;
	try {
		ratio = require_exact_binary64.exactRationalToBinary64(spanUnits, widthUnits);
	} catch {
		return {
			ok: false,
			reason: "too_many"
		};
	}
	if (!Number.isFinite(ratio)) return {
		ok: false,
		reason: "too_many"
	};
	if (ratio === 0) return {
		ok: false,
		reason: "non_tiling"
	};
	const count = Math.round(ratio);
	const tilingTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(ratio));
	if (Math.abs(ratio - count) > tilingTolerance) return {
		ok: false,
		reason: "non_tiling"
	};
	if (count < 1) return {
		ok: false,
		reason: "non_tiling"
	};
	if (!Number.isSafeInteger(count) || count > 1e5) return {
		ok: false,
		reason: "too_many"
	};
	const edges = new Array(count + 1);
	edges[0] = emittedStart;
	let exactEdgeUnits = startUnits + widthUnits;
	for (let index = 1; index < count; index++) {
		let edge;
		try {
			edge = require_exact_binary64.exactRationalToBinary64(exactEdgeUnits, 1n, coefficientExponent);
		} catch {
			return {
				ok: false,
				reason: "unrepresentable"
			};
		}
		if (exactEdgeUnits !== 0n && edge === 0) return {
			ok: false,
			reason: "unrepresentable"
		};
		if (!Number.isFinite(edge) || !(edge > edges[index - 1]) || !(edge < emittedStop)) return {
			ok: false,
			reason: "unrepresentable"
		};
		edges[index] = edge;
		exactEdgeUnits += widthUnits;
	}
	let reconstructedStop;
	try {
		reconstructedStop = require_exact_binary64.exactRationalToBinary64(startUnits + BigInt(count) * widthUnits, 1n, coefficientExponent);
	} catch {
		return {
			ok: false,
			reason: "unrepresentable"
		};
	}
	if (!Number.isFinite(reconstructedStop)) return {
		ok: false,
		reason: "unrepresentable"
	};
	const endpointTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(emittedStart), Math.abs(emittedStop), Math.abs(reconstructedStop));
	if (Math.abs(reconstructedStop - emittedStop) > endpointTolerance) return {
		ok: false,
		reason: "non_tiling"
	};
	edges[count] = emittedStop;
	return {
		ok: true,
		edges
	};
}
/**
* Materialize the centred lag geometry used by correlograms.
*
* `minCenter=-tau` and `maxCenter=+tau`; if `m=tau/width`, the result has `2m+1`
* bins centred at `k*width` for `k=-m..m`, and outer edges half a width beyond the
* declared centre range. This is deliberately separate from ordinary width bins:
* treating the two centre coordinates as outer edges would lose the end bins and move
* zero onto a boundary.
*/
function materializeCenteredLagBins(minCenter, maxCenter, width, maxBins = MAX_MATERIALIZED_BINS) {
	if (typeof minCenter !== "number" || typeof maxCenter !== "number" || typeof width !== "number" || typeof maxBins !== "number" || !Number.isFinite(minCenter) || !Number.isFinite(maxCenter) || !Number.isFinite(width) || !Number.isSafeInteger(maxBins)) return {
		ok: false,
		reason: "nonfinite"
	};
	if (!(width > 0) || !(maxCenter > minCenter) || maxBins < 1) return {
		ok: false,
		reason: "invalid_range"
	};
	const symmetryTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(minCenter), Math.abs(maxCenter));
	if (Math.abs(minCenter + maxCenter) > symmetryTolerance || !(maxCenter > 0)) return {
		ok: false,
		reason: "non_tiling"
	};
	const ratio = maxCenter / width;
	const m = Math.round(ratio);
	const ratioTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(ratio));
	if (!Number.isSafeInteger(m) || m < 1 || Math.abs(ratio - m) > ratioTolerance) return {
		ok: false,
		reason: "non_tiling"
	};
	const binCount = 2 * m + 1;
	if (!Number.isSafeInteger(binCount) || binCount > maxBins) return {
		ok: false,
		reason: "too_many"
	};
	const halfWidth = width / 2;
	const materialized = materializeWidthBins(minCenter - halfWidth, maxCenter + halfWidth, width);
	if (!materialized.ok) return materialized;
	return materialized.edges.length === binCount + 1 ? materialized : {
		ok: false,
		reason: "non_tiling"
	};
}

//#endregion
//#region src/core/response-curve-basis.ts
/**
* Closed scientific authority for response-curve rate normalizations and peak bases.
*
* A frequency unit alone does not say whether a curve is one train, a pooled event
* total, or a mean per recorded sender. Likewise, a peak rate is not reproducible
* without the bin/grid and kernel conventions that produced the maximum. This module
* owns the cross-field checks shared by request semantics and the defensive render
* boundary so those two gates cannot drift.
*/
const RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID = "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1";
/**
* ECMAScript relational comparison is lexicographic over UTF-16 code units.  Keep the
* comparator explicit: locale collation, Unicode-normalized comparison, and Python's
* native code-point ordering all define different orders for some valid identifiers.
*/
function compareUtf16CodeUnits(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
function isWellFormedUnicode(value) {
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code >= 55296 && code <= 56319) {
			const next = value.charCodeAt(index + 1);
			if (!(next >= 56320 && next <= 57343)) return false;
			index++;
		} else if (code >= 56320 && code <= 57343) return false;
	}
	return true;
}
function normalizeResponseEventMemberIds(identifiers) {
	if (!Array.isArray(identifiers) || identifiers.length === 0) throw new RangeError("identifier set must be a non-empty array");
	const seen = /* @__PURE__ */ new Set();
	for (let index = 0; index < identifiers.length; index++) {
		const identifier = identifiers[index];
		if (typeof identifier !== "string" || identifier.length === 0) throw new TypeError(`identifier-set member ${index} must be a non-empty string`);
		if (!isWellFormedUnicode(identifier)) throw new TypeError(`identifier-set member ${index} must be well-formed Unicode`);
		if (seen.has(identifier)) throw new RangeError(`identifier-set member ${JSON.stringify(identifier)} is duplicated`);
		seen.add(identifier);
	}
	return [...seen].sort(compareUtf16CodeUnits);
}
/** SHA-256 over RFC 8785 canonical JSON of the UTF-16-sorted identifier array. */
function responseEventMembershipDigest(identifiers) {
	return require_canonicalize.canonicalDigest(normalizeResponseEventMemberIds(identifiers));
}
function record(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
/** Validate the event-train selection shared by every response condition and repeat. */
function verifyResponseEventScope(value) {
	const scope = record(value);
	if (!scope) return {
		ok: false,
		path: "/eventScope",
		message: "every event-derived response must declare one eventScope."
	};
	if (typeof scope.selectionId !== "string" || scope.selectionId.length === 0) return {
		ok: false,
		path: "/eventScope/selectionId",
		message: "eventScope.selectionId must identify the selection shared by every condition and repeat."
	};
	if (scope.eventKind !== "spike") return {
		ok: false,
		path: "/eventScope/eventKind",
		message: "revision 2 response curves support spike events only."
	};
	if (scope.eventCompleteness !== "complete_for_selection_within_measurement_window") return {
		ok: false,
		path: "/eventScope/eventCompleteness",
		message: "counts, rates, and no-spike latencies require every selected spike inside the measurement window."
	};
	if (scope.kind === "single_train") {
		if (scope.poolingOperator !== "identity_single_train") return {
			ok: false,
			path: "/eventScope/poolingOperator",
			message: "single_train requires identity_single_train pooling."
		};
		if (scope.recordedSenderCount !== void 0) return {
			ok: false,
			path: "/eventScope/recordedSenderCount",
			message: "single_train declares one event train but no recorded-sender cardinality, so recordedSenderCount is inapplicable and forbidden."
		};
		return {
			ok: true,
			authority: {
				kind: "single_train",
				selectionId: scope.selectionId,
				eventKind: "spike",
				eventCompleteness: "complete_for_selection_within_measurement_window",
				poolingOperator: "identity_single_train",
				selectedEventTrainCount: 1,
				recordedSenderCount: null,
				membershipKind: "single_train_selection_rule",
				normalizedScope: {
					kind: "single_train",
					declaredSelectionId: scope.selectionId,
					declaredEventKind: "spike",
					declaredEventCompleteness: "complete_for_selection_within_measurement_window",
					declaredPoolingOperator: "identity_single_train",
					structurallyDerivedSelectedEventTrainCount: 1,
					declaredRecordedSenderCount: null,
					membershipBinding: { kind: "single_train_selection_rule" }
				}
			}
		};
	}
	if (scope.kind !== "pooled_recorded_senders") return {
		ok: false,
		path: "/eventScope/kind",
		message: "eventScope.kind must be single_train or pooled_recorded_senders."
	};
	if (scope.poolingOperator !== "superpose_selected_sender_trains") return {
		ok: false,
		path: "/eventScope/poolingOperator",
		message: "pooled_recorded_senders requires superpose_selected_sender_trains pooling."
	};
	if (!Number.isSafeInteger(scope.recordedSenderCount) || scope.recordedSenderCount < 1) return {
		ok: false,
		path: "/eventScope/recordedSenderCount",
		message: "pooled_recorded_senders requires a positive exact recordedSenderCount."
	};
	const count = scope.recordedSenderCount;
	const membership = record(scope.membershipBinding);
	const membershipKind = membership?.kind;
	let normalizedMembership;
	if (membershipKind === "explicit_sender_ids") {
		const ids = membership?.senderIds;
		if (!Array.isArray(ids) || ids.length !== count) return {
			ok: false,
			path: "/eventScope/membershipBinding/senderIds",
			message: `explicit sender membership must contain exactly recordedSenderCount=${count} ids.`
		};
		const seen = /* @__PURE__ */ new Set();
		for (let index = 0; index < ids.length; index++) {
			const id = ids[index];
			if (typeof id !== "string" || id.length === 0) return {
				ok: false,
				path: `/eventScope/membershipBinding/senderIds/${index}`,
				message: "every explicit sender id must be a non-empty identifier string."
			};
			if (!isWellFormedUnicode(id)) return {
				ok: false,
				path: `/eventScope/membershipBinding/senderIds/${index}`,
				message: "every explicit sender id must be well-formed Unicode."
			};
			if (seen.has(id)) return {
				ok: false,
				path: `/eventScope/membershipBinding/senderIds/${index}`,
				message: `explicit sender id ${JSON.stringify(id)} appears more than once.`
			};
			seen.add(id);
		}
		normalizedMembership = {
			kind: "explicit_sender_ids",
			senderIds: normalizeResponseEventMemberIds([...seen])
		};
	} else if (membershipKind !== "canonical_sender_ids_digest" && membershipKind !== "cardinality_only") return {
		ok: false,
		path: "/eventScope/membershipBinding",
		message: "pooled sender membership must be explicit, canonically digest-bound, or explicitly cardinality-only."
	};
	else if (membershipKind === "canonical_sender_ids_digest") {
		if (membership?.algorithm !== "sha256" || membership?.canonicalization !== "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1" || typeof membership?.digest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(membership.digest)) return {
			ok: false,
			path: "/eventScope/membershipBinding",
			message: "canonical sender membership requires the registered SHA-256 canonicalization and a lowercase sha256 digest."
		};
		normalizedMembership = {
			kind: "canonical_sender_ids_digest",
			algorithm: membership?.algorithm,
			canonicalization: membership?.canonicalization,
			digest: membership?.digest
		};
	} else normalizedMembership = { kind: "cardinality_only" };
	return {
		ok: true,
		authority: {
			kind: "pooled_recorded_senders",
			selectionId: scope.selectionId,
			eventKind: "spike",
			eventCompleteness: "complete_for_selection_within_measurement_window",
			poolingOperator: "superpose_selected_sender_trains",
			selectedEventTrainCount: count,
			recordedSenderCount: count,
			membershipKind,
			normalizedScope: {
				kind: "pooled_recorded_senders",
				declaredSelectionId: scope.selectionId,
				declaredEventKind: "spike",
				declaredEventCompleteness: "complete_for_selection_within_measurement_window",
				declaredPoolingOperator: "superpose_selected_sender_trains",
				structurallyDerivedSelectedEventTrainCount: count,
				declaredRecordedSenderCount: count,
				membershipBinding: normalizedMembership
			}
		}
	};
}
/** Validate event scope against rate normalization and return the exact count divisor. */
function verifyResponseRateAuthority(normalization, eventScopeValue) {
	if (normalization !== "single_train_rate" && normalization !== "total_event_rate" && normalization !== "mean_rate_per_recorded_sender") return {
		ok: false,
		path: "/rateNormalization",
		message: "a firing-rate response must declare a recognized rateNormalization."
	};
	const eventScope = verifyResponseEventScope(eventScopeValue);
	if (!eventScope.ok) return eventScope;
	if (normalization === "single_train_rate") {
		if (eventScope.authority.kind !== "single_train") return {
			ok: false,
			path: "/eventScope/kind",
			message: "single_train_rate requires eventScope.kind single_train."
		};
		return {
			ok: true,
			normalization,
			recordedSenderCount: null,
			integerDivisor: 1,
			eventScope: eventScope.authority
		};
	}
	if (eventScope.authority.kind !== "pooled_recorded_senders") return {
		ok: false,
		path: "/eventScope/kind",
		message: `${normalization} requires eventScope.kind pooled_recorded_senders.`
	};
	return {
		ok: true,
		normalization,
		recordedSenderCount: eventScope.authority.recordedSenderCount,
		integerDivisor: normalization === "mean_rate_per_recorded_sender" ? eventScope.authority.recordedSenderCount : 1,
		eventScope: eventScope.authority
	};
}
function finite(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function positiveDuration(quantity) {
	const node = record(quantity);
	const value = finite(node?.value);
	const unit = typeof node?.unit === "string" ? node.unit : void 0;
	return value !== void 0 && value > 0 && unit !== void 0 && dimensionOf(unit) === "time" ? {
		value,
		unit
	} : void 0;
}
function materializeDeclaredGrid(quantity, declaredCount, windowStart, windowStop, windowUnit, quantityPath, countPath, noun) {
	const duration = positiveDuration(quantity);
	if (!duration) return {
		ok: false,
		path: quantityPath,
		message: `${noun} width/step must be a positive registered duration.`
	};
	if (!Number.isSafeInteger(declaredCount) || declaredCount < 1) return {
		ok: false,
		path: countPath,
		message: `${noun} count must be a positive exact safe integer.`
	};
	let widthInWindowUnit;
	try {
		widthInWindowUnit = convert(duration.value, duration.unit, windowUnit);
	} catch (error) {
		return {
			ok: false,
			path: quantityPath,
			message: `the declared ${noun} width/step cannot be converted into the measurement-window unit (${error instanceof Error ? error.message : "conversion failed"}).`
		};
	}
	const materialized = materializeWidthBins(windowStart, windowStop, widthInWindowUnit);
	if (!materialized.ok) return {
		ok: false,
		path: quantityPath,
		message: `the declared ${noun} width/step does not materialize the measurement window under ${noun === "bin" ? "cortexel_binary64_uniform_exposure_bins_v1" : "cortexel_binary64_nominal_steps_v1"} (${materialized.reason}).`
	};
	const materializedCount = materialized.edges.length - 1;
	if (materializedCount !== declaredCount) return {
		ok: false,
		path: countPath,
		message: `declared ${noun} count ${String(declaredCount)} does not equal the ${materializedCount} endpoint-authoritative ${noun} candidate${materializedCount === 1 ? "" : "s"} materialized from the typed window and width/step.`
	};
	if (noun === "bin") for (let index = 0; index < materializedCount; index++) {
		let comparison;
		try {
			comparison = compareExactUnitSumToValue([{
				value: materialized.edges[index + 1],
				unit: windowUnit
			}, {
				value: -materialized.edges[index],
				unit: windowUnit
			}], duration);
		} catch (error) {
			return {
				ok: false,
				path: quantityPath,
				message: `exact physical exposure comparison failed (${error instanceof Error ? error.message : "comparison failed"}).`
			};
		}
		if (comparison !== 0) return {
			ok: false,
			path: quantityPath,
			message: `emitted bin ${index} does not have exact physical exposure equal to the typed binWidth; a max-bin count is insufficient rate authority for a nonuniform grid. Use an exactly representable common unit or explicit per-bin count/exposure data.`
		};
	}
	return noun === "bin" ? {
		ok: true,
		kind: "binned_count",
		materializedCount,
		widthInWindowUnit,
		uniformExposureVerified: true
	} : {
		ok: true,
		kind: "kernel_sampled_grid",
		materializedCount,
		stepInWindowUnit: widthInWindowUnit
	};
}
/**
* Bind a peak-rate estimator basis to its typed measurement window.
*
* Candidate coordinates reuse `materializeWidthBins`: widths are converted once,
* exactly-rationally rounded into the window unit, and then checked with the published
* bounded binary64 allowance. A sampled kernel grid treats those emitted coordinates as
* authoritative. A binned-count peak additionally proves that every emitted endpoint
* difference is exactly the original typed physical width; without that stronger
* invariant a maximum count does not determine a maximum rate.
*/
function verifyPeakBasisAgainstWindow(basisValue, windowValue) {
	const basis = record(basisValue);
	const window = record(windowValue);
	const windowStart = finite(window?.start);
	const windowStop = finite(window?.stop);
	const windowUnit = typeof window?.unit === "string" ? window.unit : void 0;
	const windowBoundary = window?.boundary === "[start,stop]" ? "[start,stop]" : "[start,stop)";
	if (!basis || windowStart === void 0 || windowStop === void 0 || !(windowStop > windowStart) || !windowUnit || dimensionOf(windowUnit) !== "time") return {
		ok: false,
		path: "/measurementWindow",
		message: "peak-basis verification requires a finite, strictly ordered measurement window in a registered time unit."
	};
	if (basis.estimator === "binned_count") {
		if (windowBoundary !== "[start,stop)" || basis.boundary !== windowBoundary) return {
			ok: false,
			path: "/basis/boundary",
			message: "binned_count peak estimation requires the same half-open [start,stop) boundary as the measurement window."
		};
		return materializeDeclaredGrid(basis.binWidth, basis.binCount, windowStart, windowStop, windowUnit, "/basis/binWidth", "/basis/binCount", "bin");
	}
	if (basis.estimator !== "kernel") return {
		ok: false,
		path: "/basis/estimator",
		message: "unknown peak-rate estimator basis."
	};
	const shape = basis.shape;
	const form = basis.kernelForm;
	const bandwidthDefinition = basis.bandwidthDefinition;
	const support = record(basis.support);
	const supportKind = support?.kind;
	const symmetric = form === "symmetric" || form === "symmetric_laplace";
	if (!(shape === "gaussian" && form === "symmetric" && bandwidthDefinition === "standard_deviation" && (supportKind === "analytic_infinite" || supportKind === "finite_cutoff" && support?.geometry === "symmetric_radius") || shape === "boxcar" && (form === "symmetric" || form === "causal_past") && bandwidthDefinition === "full_width" && supportKind === "finite_full_width" || shape === "exponential" && form === "causal_past" && bandwidthDefinition === "time_constant" && (supportKind === "analytic_infinite" || supportKind === "finite_cutoff" && support?.geometry === "past_horizon") || shape === "laplace" && form === "symmetric_laplace" && bandwidthDefinition === "time_constant" && (supportKind === "analytic_infinite" || supportKind === "finite_cutoff" && support?.geometry === "symmetric_radius"))) return {
		ok: false,
		path: "/basis",
		message: "kernel shape, form, bandwidth definition, and support are not a recognized mathematical combination."
	};
	if (!positiveDuration(basis.bandwidth)) return {
		ok: false,
		path: "/basis/bandwidth",
		message: "kernel bandwidth must be a positive registered duration."
	};
	if (supportKind === "finite_cutoff" && !positiveDuration(support?.cutoff)) return {
		ok: false,
		path: "/basis/support/cutoff",
		message: "a finite kernel cutoff must be a positive registered duration."
	};
	if (basis.edgePolicy === "renormalize_evaluation_mass" && !symmetric) return {
		ok: false,
		path: "/basis/edgePolicy",
		message: "renormalize_evaluation_mass is refused for causal_past kernels because the available kernel mass is zero at the included window start."
	};
	const evaluation = record(basis.evaluation);
	if (evaluation?.mode === "continuous_supremum") {
		if (evaluation.boundary !== windowBoundary) return {
			ok: false,
			path: "/basis/evaluation/boundary",
			message: "continuous kernel evaluation must use the measurement window boundary verbatim."
		};
		return {
			ok: true,
			kind: "kernel_continuous"
		};
	}
	if (evaluation?.mode === "sampled_grid") {
		if (windowBoundary !== "[start,stop)" || evaluation.boundary !== windowBoundary) return {
			ok: false,
			path: "/basis/evaluation/boundary",
			message: "sampled-grid kernel evaluation requires the same half-open [start,stop) boundary as the measurement window."
		};
		return materializeDeclaredGrid(evaluation.step, evaluation.sampleCount, windowStart, windowStop, windowUnit, "/basis/evaluation/step", "/basis/evaluation/sampleCount", "sample");
	}
	return {
		ok: false,
		path: "/basis/evaluation",
		message: "kernel peak estimation requires continuous_supremum or a fully declared sampled_grid."
	};
}
/**
* Verify the discrete value lattice implied by an aggregate binned-count peak.
*
* Raw binned peaks carry exact `audit.peakBinCounts`; their rates and condition estimates
* are re-derived from those identified counts and are deliberately not accepted through
* an existential inverse. Aggregate-only input omits the repeats, so mean/trimmed mean is
* checked as the sum of retained integer max-bin counts divided by retained n; an odd
* median remains on the raw lattice and an even median is the mean of two integer central
* order statistics. Existence on that exact lattice is checkable without inventing the
* omitted counts.
*/
function verifyBinnedPeakValueLattice(valuesValue, basisValue, rateUnitValue, integerDivisor, mode, estimatorValue, sampleCountsValue) {
	const values = Array.isArray(valuesValue) ? valuesValue : void 0;
	const basis = record(basisValue);
	const binWidth = positiveDuration(basis?.binWidth);
	const rateUnit = typeof rateUnitValue === "string" ? rateUnitValue : void 0;
	if (!values || basis?.estimator !== "binned_count" || !binWidth || !rateUnit || dimensionOf(rateUnit) !== "frequency" || !Number.isSafeInteger(integerDivisor) || integerDivisor < 1) return {
		ok: false,
		path: "/basis",
		message: "binned-peak value-lattice verification requires a complete binned_count basis, a frequency unit, and a positive exact rate divisor."
	};
	const aggregate = mode === "aggregates";
	if (!aggregate) return {
		ok: false,
		path: "/audit/peakBinCounts",
		message: "raw binned peaks require identified exact peakBinCounts and cannot use aggregate existential lattice verification."
	};
	const sampleCounts = aggregate && Array.isArray(sampleCountsValue) ? sampleCountsValue : void 0;
	if (aggregate && (!sampleCounts || sampleCounts.length !== values.length)) return {
		ok: false,
		path: "/sampleCounts",
		message: "aggregate binned-peak lattice verification requires one retained sample count per response value."
	};
	const estimator = estimatorValue === "mean" || estimatorValue === "median" || estimatorValue === "trimmed_mean" ? estimatorValue : void 0;
	if (aggregate && !estimator) return {
		ok: false,
		path: "/estimator",
		message: "aggregate binned-peak lattice verification requires a recognized estimator."
	};
	let checkedValueCount = 0;
	let denominatorMinimum = null;
	let denominatorMaximum = null;
	for (let index = 0; index < values.length; index++) {
		const value = values[index];
		if (value === null) continue;
		if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return {
			ok: false,
			path: `/values/${index}`,
			message: "a binned peak rate must be finite and non-negative before its exact count lattice can be checked."
		};
		let estimatorDenominator = 1;
		if (aggregate) {
			const retainedCount = sampleCounts[index];
			if (!Number.isSafeInteger(retainedCount) || retainedCount < 1) return {
				ok: false,
				path: `/sampleCounts/${index}`,
				message: "a defined aggregate binned peak requires a positive exact retained sample count."
			};
			estimatorDenominator = estimator === "median" ? retainedCount % 2 === 0 ? 2 : 1 : retainedCount;
		}
		if (!isRoundedAggregateCountRateInUnit(value, integerDivisor, estimatorDenominator, binWidth.value, binWidth.unit, rateUnit)) {
			const estimatorDescription = aggregate ? estimator === "median" ? `${sampleCounts[index] % 2 === 0 ? "even" : "odd"}-sample median` : `${estimator} over ${String(sampleCounts[index])} retained repeats` : "raw repeat";
			return {
				ok: false,
				path: `/values/${index}`,
				message: `binned peak ${String(value)} ${rateUnit} cannot be the correctly rounded ${estimatorDescription} of exact non-negative safe-integer max-bin counts under divisor ${integerDivisor} and bin width ${binWidth.value} ${binWidth.unit}.`
			};
		}
		checkedValueCount++;
		denominatorMinimum = denominatorMinimum === null ? estimatorDenominator : Math.min(denominatorMinimum, estimatorDenominator);
		denominatorMaximum = denominatorMaximum === null ? estimatorDenominator : Math.max(denominatorMaximum, estimatorDenominator);
	}
	return {
		ok: true,
		checkedValueCount,
		estimatorDenominatorMinimum: denominatorMinimum,
		estimatorDenominatorMaximum: denominatorMaximum
	};
}

//#endregion
Object.defineProperty(exports, 'MAX_MATERIALIZED_BINS', {
  enumerable: true,
  get: function () {
    return MAX_MATERIALIZED_BINS;
  }
});
Object.defineProperty(exports, 'RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID', {
  enumerable: true,
  get: function () {
    return RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID;
  }
});
Object.defineProperty(exports, 'axesAreCompatible', {
  enumerable: true,
  get: function () {
    return axesAreCompatible;
  }
});
Object.defineProperty(exports, 'axisNormalizedDerivativeConversionReceipt', {
  enumerable: true,
  get: function () {
    return axisNormalizedDerivativeConversionReceipt;
  }
});
Object.defineProperty(exports, 'canonicalUnitFor', {
  enumerable: true,
  get: function () {
    return canonicalUnitFor;
  }
});
Object.defineProperty(exports, 'checkQuantityUnit', {
  enumerable: true,
  get: function () {
    return checkQuantityUnit;
  }
});
Object.defineProperty(exports, 'compareExactUnitArraySumToDifference', {
  enumerable: true,
  get: function () {
    return compareExactUnitArraySumToDifference;
  }
});
Object.defineProperty(exports, 'compareExactUnitSumToValue', {
  enumerable: true,
  get: function () {
    return compareExactUnitSumToValue;
  }
});
Object.defineProperty(exports, 'compareUtf16CodeUnits', {
  enumerable: true,
  get: function () {
    return compareUtf16CodeUnits;
  }
});
Object.defineProperty(exports, 'compositeDerivativeConversionReceipt', {
  enumerable: true,
  get: function () {
    return compositeDerivativeConversionReceipt;
  }
});
Object.defineProperty(exports, 'conversionFactor', {
  enumerable: true,
  get: function () {
    return conversionFactor;
  }
});
Object.defineProperty(exports, 'conversionReceipt', {
  enumerable: true,
  get: function () {
    return conversionReceipt;
  }
});
Object.defineProperty(exports, 'convert', {
  enumerable: true,
  get: function () {
    return convert;
  }
});
Object.defineProperty(exports, 'convertCompositeDerivative', {
  enumerable: true,
  get: function () {
    return convertCompositeDerivative;
  }
});
Object.defineProperty(exports, 'convertDifference', {
  enumerable: true,
  get: function () {
    return convertDifference;
  }
});
Object.defineProperty(exports, 'convertExactUnitSum', {
  enumerable: true,
  get: function () {
    return convertExactUnitSum;
  }
});
Object.defineProperty(exports, 'deriveExactAggregateCountRateInUnit', {
  enumerable: true,
  get: function () {
    return deriveExactAggregateCountRateInUnit;
  }
});
Object.defineProperty(exports, 'deriveExactAggregateCountRateOverIntervalsInUnit', {
  enumerable: true,
  get: function () {
    return deriveExactAggregateCountRateOverIntervalsInUnit;
  }
});
Object.defineProperty(exports, 'deriveExactCountRateInUnit', {
  enumerable: true,
  get: function () {
    return deriveExactCountRateInUnit;
  }
});
Object.defineProperty(exports, 'deriveExactCountRateMinusAggregateRateOverIntervalsInUnit', {
  enumerable: true,
  get: function () {
    return deriveExactCountRateMinusAggregateRateOverIntervalsInUnit;
  }
});
Object.defineProperty(exports, 'deriveExactCountRateWithIntegerFactorsInUnit', {
  enumerable: true,
  get: function () {
    return deriveExactCountRateWithIntegerFactorsInUnit;
  }
});
Object.defineProperty(exports, 'dimensionOf', {
  enumerable: true,
  get: function () {
    return dimensionOf;
  }
});
Object.defineProperty(exports, 'divideExactIntegerByConvertedDifference', {
  enumerable: true,
  get: function () {
    return divideExactIntegerByConvertedDifference;
  }
});
Object.defineProperty(exports, 'isKnownUnit', {
  enumerable: true,
  get: function () {
    return isKnownUnit;
  }
});
Object.defineProperty(exports, 'isQuantityKind', {
  enumerable: true,
  get: function () {
    return isQuantityKind;
  }
});
Object.defineProperty(exports, 'kindAcceptsDimension', {
  enumerable: true,
  get: function () {
    return kindAcceptsDimension;
  }
});
Object.defineProperty(exports, 'materializeCenteredLagBins', {
  enumerable: true,
  get: function () {
    return materializeCenteredLagBins;
  }
});
Object.defineProperty(exports, 'materializeWidthBins', {
  enumerable: true,
  get: function () {
    return materializeWidthBins;
  }
});
Object.defineProperty(exports, 'normalizeDerivativeByExactAxisExtent', {
  enumerable: true,
  get: function () {
    return normalizeDerivativeByExactAxisExtent;
  }
});
Object.defineProperty(exports, 'normalizeResponseEventMemberIds', {
  enumerable: true,
  get: function () {
    return normalizeResponseEventMemberIds;
  }
});
Object.defineProperty(exports, 'reciprocalUnit', {
  enumerable: true,
  get: function () {
    return reciprocalUnit;
  }
});
Object.defineProperty(exports, 'resolveAlias', {
  enumerable: true,
  get: function () {
    return resolveAlias;
  }
});
Object.defineProperty(exports, 'responseEventMembershipDigest', {
  enumerable: true,
  get: function () {
    return responseEventMembershipDigest;
  }
});
Object.defineProperty(exports, 'toSeconds', {
  enumerable: true,
  get: function () {
    return toSeconds;
  }
});
Object.defineProperty(exports, 'unitLabel', {
  enumerable: true,
  get: function () {
    return unitLabel;
  }
});
Object.defineProperty(exports, 'verifyBinnedPeakValueLattice', {
  enumerable: true,
  get: function () {
    return verifyBinnedPeakValueLattice;
  }
});
Object.defineProperty(exports, 'verifyPeakBasisAgainstWindow', {
  enumerable: true,
  get: function () {
    return verifyPeakBasisAgainstWindow;
  }
});
Object.defineProperty(exports, 'verifyResponseEventScope', {
  enumerable: true,
  get: function () {
    return verifyResponseEventScope;
  }
});
Object.defineProperty(exports, 'verifyResponseRateAuthority', {
  enumerable: true,
  get: function () {
    return verifyResponseRateAuthority;
  }
});
//# sourceMappingURL=response-curve-basis-BoFkbgrp.cjs.map