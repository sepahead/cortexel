//#region src/core/exact-binary64.ts
/** Exact finite-binary64 accumulation followed by one round-to-nearest, ties-to-even. */
const FRACTION_BITS = 52n;
const FRACTION_MASK = (1n << FRACTION_BITS) - 1n;
const HIDDEN_BIT = 1n << FRACTION_BITS;
const SIGN_BIT = 1n << 63n;
const scratch = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
function finiteValueInMinSubnormalUnits(value) {
	if (!Number.isFinite(value)) throw new Error("exact binary64 accumulation requires finite values");
	scratch.setFloat64(0, value, false);
	const bits = scratch.getBigUint64(0, false);
	const negative = (bits & SIGN_BIT) !== 0n;
	const exponentBits = Number(bits >> FRACTION_BITS & 2047n);
	const fraction = bits & FRACTION_MASK;
	if (exponentBits === 0 && fraction === 0n) return 0n;
	const units = (exponentBits === 0 ? fraction : HIDDEN_BIT + fraction) << (exponentBits === 0 ? 0n : BigInt(exponentBits - 1));
	return negative ? -units : units;
}
/** Exact integer coefficient `n` such that a finite binary64 value equals `n * 2^-1074`. */
function finiteBinary64ToMinSubnormalUnits(value) {
	return finiteValueInMinSubnormalUnits(value);
}
function bitLength(value) {
	return value === 0n ? 0 : value.toString(2).length;
}
function roundedQuotientEven(numerator, denominator) {
	const quotient = numerator / denominator;
	const doubled = numerator % denominator << 1n;
	if (doubled > denominator || doubled === denominator && (quotient & 1n) === 1n) return quotient + 1n;
	return quotient;
}
function binary64FromBits(bits) {
	scratch.setBigUint64(0, bits, false);
	return scratch.getFloat64(0, false);
}
function floorBinaryLogarithmOfRational(numerator, denominator) {
	let exponent = bitLength(numerator) - bitLength(denominator);
	const numeratorAtExponent = exponent >= 0 ? denominator << BigInt(exponent) : denominator;
	if ((exponent >= 0 ? numerator : numerator << BigInt(-exponent)) < numeratorAtExponent) exponent--;
	return exponent;
}
function roundedScaledQuotient(numerator, denominator, binaryShift) {
	return binaryShift >= 0 ? roundedQuotientEven(numerator << BigInt(binaryShift), denominator) : roundedQuotientEven(numerator, denominator << BigInt(-binaryShift));
}
/** Round `(signedNumerator / denominator) * 2^binaryExponent` to binary64. */
function roundRationalWithBinaryExponent(signedNumerator, denominator, binaryExponent) {
	if (denominator <= 0n) throw new Error("exact binary64 denominator must be positive");
	if (signedNumerator === 0n) return {
		value: 0,
		exactNonZero: false
	};
	const negative = signedNumerator < 0n;
	const numerator = negative ? -signedNumerator : signedNumerator;
	let exponentBits;
	let fraction;
	let valueExponent = floorBinaryLogarithmOfRational(numerator, denominator) + binaryExponent;
	if (valueExponent < -1022) {
		const subnormal = roundedScaledQuotient(numerator, denominator, binaryExponent + 1074);
		if (subnormal === 0n) return {
			value: negative ? -0 : 0,
			exactNonZero: true
		};
		if (subnormal >= HIDDEN_BIT) {
			exponentBits = 1;
			fraction = 0n;
		} else {
			exponentBits = 0;
			fraction = subnormal;
		}
	} else {
		let mantissa = roundedScaledQuotient(numerator, denominator, binaryExponent + 52 - valueExponent);
		if (mantissa === HIDDEN_BIT << 1n) {
			mantissa >>= 1n;
			valueExponent++;
		}
		exponentBits = valueExponent + 1023;
		if (exponentBits >= 2047) throw new Error("exact binary64 result overflows the finite range");
		fraction = mantissa - HIDDEN_BIT;
	}
	return {
		value: binary64FromBits((negative ? SIGN_BIT : 0n) | BigInt(exponentBits) << FRACTION_BITS | fraction),
		exactNonZero: true
	};
}
function comparePositiveRationalToPowerOfTwo(numerator, denominator, binaryExponent) {
	const left = binaryExponent < 0 ? numerator << BigInt(-binaryExponent) : numerator;
	const right = binaryExponent < 0 ? denominator : denominator << BigInt(binaryExponent);
	return left < right ? -1 : left > right ? 1 : 0;
}
/** `floor(log2(sqrt(numerator / denominator)))` without materializing the root. */
function floorBinaryLogarithmOfSquareRootRational(numerator, denominator) {
	let exponent = Math.floor((bitLength(numerator) - bitLength(denominator)) / 2);
	while (comparePositiveRationalToPowerOfTwo(numerator, denominator, 2 * exponent) < 0) exponent--;
	while (comparePositiveRationalToPowerOfTwo(numerator, denominator, 2 * (exponent + 1)) >= 0) exponent++;
	return exponent;
}
function integerSquareRootFloor(value) {
	if (value < 0n) throw new Error("integer square root requires a non-negative value");
	if (value < 2n) return value;
	let estimate = 1n << BigInt(Math.ceil(bitLength(value) / 2));
	for (;;) {
		const next = estimate + value / estimate >> 1n;
		if (next >= estimate) return estimate;
		estimate = next;
	}
}
/** Round `sqrt(numerator / denominator) * 2^binaryShift` to an integer, ties to even. */
function roundedSquareRootScaledQuotient(numerator, denominator, binaryShift) {
	const doubledShift = 2 * binaryShift;
	const scaledNumerator = doubledShift >= 0 ? numerator << BigInt(doubledShift) : numerator;
	const scaledDenominator = doubledShift >= 0 ? denominator : denominator << BigInt(-doubledShift);
	const lower = integerSquareRootFloor(scaledNumerator / scaledDenominator);
	const midpointTwice = (lower << 1n) + 1n;
	const left = scaledNumerator << 2n;
	const right = scaledDenominator * midpointTwice * midpointTwice;
	if (left > right || left === right && (lower & 1n) === 1n) return lower + 1n;
	return lower;
}
/** Round `sqrt(numerator / denominator) * 2^binaryExponent` to binary64. */
function roundSquareRootRationalWithBinaryExponent(numerator, denominator, binaryExponent) {
	if (numerator < 0n) throw new Error("exact binary64 square root requires a non-negative numerator");
	if (denominator <= 0n) throw new Error("exact binary64 square-root denominator must be positive");
	if (numerator === 0n) return {
		value: 0,
		exactNonZero: false
	};
	let valueExponent = floorBinaryLogarithmOfSquareRootRational(numerator, denominator) + binaryExponent;
	let exponentBits;
	let fraction;
	if (valueExponent < -1022) {
		const subnormal = roundedSquareRootScaledQuotient(numerator, denominator, binaryExponent + 1074);
		if (subnormal === 0n) return {
			value: 0,
			exactNonZero: true
		};
		if (subnormal >= HIDDEN_BIT) {
			exponentBits = 1;
			fraction = 0n;
		} else {
			exponentBits = 0;
			fraction = subnormal;
		}
	} else {
		let mantissa = roundedSquareRootScaledQuotient(numerator, denominator, binaryExponent + 52 - valueExponent);
		if (mantissa === HIDDEN_BIT << 1n) {
			mantissa >>= 1n;
			valueExponent++;
		}
		exponentBits = valueExponent + 1023;
		if (exponentBits >= 2047) throw new Error("exact binary64 square-root result overflows the finite range");
		fraction = mantissa - HIDDEN_BIT;
	}
	return {
		value: binary64FromBits(BigInt(exponentBits) << FRACTION_BITS | fraction),
		exactNonZero: true
	};
}
/**
* The correctly rounded arithmetic mean of finite binary64 inputs.
*
* Each input is decoded as an exact integer multiple of 2^-1074, all integers are summed,
* division by N remains rational, and only the final result is rounded. The result is
* invariant under input permutation. A non-zero exact mean that underflows to signed zero
* is refused because downstream normalization could otherwise turn real variation into a
* flat line while still claiming that the constants were representable.
*/
function exactBinary64MeanResult(values) {
	if (values.length === 0) throw new Error("exact binary64 mean requires at least one value");
	let numerator = 0n;
	for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
	return roundRationalWithBinaryExponent(numerator, BigInt(values.length), -1074);
}
/** Correctly rounded mean, permitting a non-zero exact result to round to canonical zero. */
function roundedBinary64Mean(values) {
	const rounded = exactBinary64MeanResult(values);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64Mean(values) {
	const rounded = exactBinary64MeanResult(values);
	if (rounded.exactNonZero && rounded.value === 0) throw new Error("exact binary64 mean underflows to zero");
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
/**
* Correctly rounded empirical quantile under Hyndman-Fan Type 7.
*
* For sorted observations `x[0..n-1]` and the exact supplied binary64 probability
* `p`, this evaluates `h = (n - 1) * p`, `j = floor(h)`, and
* `x[j] + (h - j) * (x[j + 1] - x[j])`. The index, interpolation fraction, and
* endpoint products remain exact BigInt rationals; only the final quantile is rounded.
* A mathematically non-zero result that rounds to zero is refused.
*/
function exactBinary64EmpiricalQuantileType7(values, probability) {
	if (values.length === 0) throw new Error("exact binary64 Type-7 quantile requires at least one value");
	if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error("exact binary64 Type-7 quantile probability must be finite and lie in [0, 1]");
	const ordered = values.map((value) => {
		if (!Number.isFinite(value)) throw new Error("exact binary64 Type-7 quantile requires finite values");
		return value === 0 ? 0 : value;
	}).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
	if (ordered.length === 1) return ordered[0];
	const denominator = 1n << 1074n;
	const scaledPosition = finiteValueInMinSubnormalUnits(probability === 0 ? 0 : probability) * BigInt(ordered.length - 1);
	const lowerIndex = Number(scaledPosition / denominator);
	const fractionNumerator = scaledPosition % denominator;
	if (lowerIndex === ordered.length - 1 || fractionNumerator === 0n) return ordered[lowerIndex];
	const lower = finiteValueInMinSubnormalUnits(ordered[lowerIndex]);
	const upper = finiteValueInMinSubnormalUnits(ordered[lowerIndex + 1]);
	return finiteNonzeroRoundedResult(roundRationalWithBinaryExponent(lower * (denominator - fractionNumerator) + upper * fractionNumerator, denominator, -1074), "Type-7 quantile");
}
function exactBinary64SampleVarianceRatio(values) {
	if (values.length < 2) throw new Error("exact binary64 sample variance requires at least two values");
	const origin = finiteValueInMinSubnormalUnits(values[0]);
	let sum = 0n;
	let sumSquares = 0n;
	for (const value of values) {
		const difference = finiteValueInMinSubnormalUnits(value) - origin;
		sum += difference;
		sumSquares += difference * difference;
	}
	const count = BigInt(values.length);
	const numerator = count * sumSquares - sum * sum;
	if (numerator < 0n) throw new Error("exact binary64 sample variance invariant was violated");
	return {
		numerator,
		denominator: count * (count - 1n),
		count
	};
}
/**
* Correctly rounded finite sample standard deviation (`n - 1` denominator).
*
* Binary64 inputs are exact integer multiples of 2^-1074. After translating by
* the first observation, the exact variance numerator is
* `n * sum(d[i]^2) - sum(d[i])^2`; the exact sample variance denominator is
* `n * (n - 1)`. Its square root is rounded directly to binary64. No binary64
* mean, difference, square, or sum is formed. Non-zero underflow and finite-range
* overflow are refused rather than returned as zero or infinity.
*/
function exactBinary64SampleStandardDeviation(values) {
	const variance = exactBinary64SampleVarianceRatio(values);
	if (variance.numerator === 0n) return 0;
	return finiteNonzeroRoundedResult(roundSquareRootRationalWithBinaryExponent(variance.numerator, variance.denominator, -1074), "sample standard deviation");
}
/**
* Whether `value` can be the correctly rounded mean of `count` exact non-negative
* safe-integer observations.
*
* If such observations exist, their integer total S lies in [0, count*MAX_SAFE_INTEGER]
* and the published mean is roundToBinary64(S/count). The closest integer totals to the
* exact product value*count are floor and ceil; if neither rounds back to `value`, no more
* distant lattice point can lie inside that binary64 value's contiguous rounding interval.
* This turns an aggregate count estimator into a machine-checkable lattice claim without
* reconstructing or inventing the missing raw observations.
*/
function isRoundedMeanOfSafeNonnegativeIntegers(value, count) {
	if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(count) || count < 1) return false;
	const canonicalValue = value === 0 ? 0 : value;
	const floorTotal = finiteValueInMinSubnormalUnits(canonicalValue) * BigInt(count) / (1n << 1074n);
	const maximumTotal = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(count);
	for (const total of [floorTotal, floorTotal + 1n]) {
		if (total < 0n || total > maximumTotal) continue;
		if (exactRationalToBinary64(total, BigInt(count)) === canonicalValue) return true;
	}
	return false;
}
/** Exact `floor(value * factor)` for a non-negative binary64 and safe integer. */
function floorExactBinary64TimesSafeInteger(value, factor) {
	if (!Number.isFinite(value) || value < 0) throw new Error("exact floor product requires a finite non-negative binary64 value");
	if (!Number.isSafeInteger(factor) || factor < 0) throw new Error("exact floor product requires a non-negative safe-integer factor");
	const quotient = finiteValueInMinSubnormalUnits(value) * BigInt(factor) / (1n << 1074n);
	if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("exact floor product exceeds the safe-integer range");
	return Number(quotient);
}
/** Correctly rounded sum with exact cancellation before the one final rounding step. */
function exactBinary64Sum(values) {
	let numerator = 0n;
	for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
	const rounded = roundRationalWithBinaryExponent(numerator, 1n, -1074);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactWeightedProductSum(values, weights) {
	if (values.length === 0 || values.length !== weights.length) throw new Error("exact binary64 weighted aggregate requires equal non-empty value and weight arrays");
	let numerator = 0n;
	let weightSum = 0n;
	for (let index = 0; index < values.length; index++) {
		const valueUnits = finiteValueInMinSubnormalUnits(values[index]);
		const weightUnits = finiteValueInMinSubnormalUnits(weights[index]);
		if (weightUnits <= 0n) throw new Error("exact binary64 weighted aggregate requires finite positive weights");
		numerator += valueUnits * weightUnits;
		weightSum += weightUnits;
	}
	return {
		numerator,
		weightSum
	};
}
function finiteNonzeroRoundedResult(rounded, noun) {
	if (rounded.exactNonZero && rounded.value === 0) throw new Error(`exact binary64 ${noun} underflows to zero`);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
/**
* Correctly round `sum(value[i] * weight[i])` once, after exact products and
* cancellation. Every input is a finite binary64 and every weight is strictly positive.
*/
function exactBinary64WeightedSum(values, weights) {
	return finiteNonzeroRoundedResult(roundRationalWithBinaryExponent(exactWeightedProductSum(values, weights).numerator, 1n, -2148), "weighted sum");
}
/**
* Correctly round `sum(value[i] * weight[i]) / sum(weight[i])` without first
* materializing either products or a weight sum in binary64. The exact ratio is
* invariant under input permutation and under any exactly common rescaling of weights.
*/
function exactBinary64WeightedMean(values, weights) {
	const aggregate = exactWeightedProductSum(values, weights);
	return finiteNonzeroRoundedResult(roundRationalWithBinaryExponent(aggregate.numerator, aggregate.weightSum, -1074), "weighted mean");
}
/** Correctly round an exact rational times a power of two to binary64. */
function exactRationalToBinary64(numerator, denominator, binaryExponent = 0) {
	const rounded = roundRationalWithBinaryExponent(numerator, denominator, binaryExponent);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
/** Correctly round `value * (numerator / denominator) * 2^binaryExponent`. */
function exactBinary64MultiplyByRational(value, numerator, denominator, binaryExponent = 0) {
	return exactRationalToBinary64(finiteValueInMinSubnormalUnits(value) * numerator, denominator, binaryExponent - 1074);
}
/**
* Correctly round `numerator / (integerFactor * denominatorValue)` without ever
* materializing the product in binary64.
*
* This is the stable shape needed by rate derivations: a finite bin width and a
* positive integer population/trial count may have a product above MAX_VALUE even
* though the resulting rate remains representable. Conversely, a non-zero exact
* quotient that rounds to zero is refused rather than being reported as a measured
* zero.
*/
function exactBinary64DivideByIntegerProduct(numerator, integerFactor, denominatorValue) {
	if (!Number.isFinite(numerator)) throw new Error("exact binary64 quotient requires a finite numerator");
	if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) throw new Error("exact binary64 quotient requires a positive safe-integer factor");
	if (!Number.isFinite(denominatorValue) || !(denominatorValue > 0)) throw new Error("exact binary64 quotient requires a finite positive denominator value");
	const numeratorUnits = finiteValueInMinSubnormalUnits(numerator);
	const result = exactRationalToBinary64(numeratorUnits, BigInt(integerFactor) * finiteValueInMinSubnormalUnits(denominatorValue));
	if (numeratorUnits !== 0n && result === 0) throw new Error("exact binary64 quotient underflows to zero");
	return result;
}
/** Exact relative-error predicate: |a-b|/max(|a|,|b|) <= N*2^-52. */
function binary64RelativeDifferenceWithinEpsilons(left, right, epsilonMultiples) {
	if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isSafeInteger(epsilonMultiples) || epsilonMultiples < 0) return false;
	const leftUnits = finiteValueInMinSubnormalUnits(left);
	const rightUnits = finiteValueInMinSubnormalUnits(right);
	const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
	const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
	const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
	if (scale === 0n) return true;
	return (leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits) << 52n <= BigInt(epsilonMultiples) * scale;
}
/**
* Exact relative-error predicate:
* `|left-right| / max(|left|,|right|) <= relativeTolerance`.
*
* All three binary64 inputs are decoded to exact integers. The comparison is then
* cross-multiplied in BigInt, so it remains meaningful for subnormals where ordinary
* subtraction or `relativeTolerance * scale` may underflow to zero.
*/
function binary64RelativeDifferenceWithinTolerance(left, right, relativeTolerance) {
	if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(relativeTolerance) || relativeTolerance < 0) return false;
	const leftUnits = finiteValueInMinSubnormalUnits(left);
	const rightUnits = finiteValueInMinSubnormalUnits(right);
	const toleranceUnits = finiteValueInMinSubnormalUnits(relativeTolerance);
	const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
	const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
	const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
	if (scale === 0n) return true;
	return (leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits) << 1074n <= scale * toleranceUnits;
}
/** Exact finite-binary64 sum encoded as an integer multiple of 2^-1074. */
function exactBinary64SumUnits(values) {
	let numerator = 0n;
	for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
	return numerator.toString(10);
}
/**
* Correctly round `value / mean`, where `mean` is the exact arithmetic mean of the
* binary64 values whose integer-unit sum is recorded by `exactBinary64SumUnits`.
*/
function exactBinary64RatioToMean(value, exactSumUnits, count) {
	if (!Number.isSafeInteger(count) || count < 1) throw new Error("exact binary64 mean ratio requires a positive safe-integer count");
	const denominator = BigInt(exactSumUnits);
	if (denominator <= 0n) throw new Error("exact binary64 mean ratio requires a strictly positive exact mean");
	const rounded = roundRationalWithBinaryExponent(finiteValueInMinSubnormalUnits(value) * BigInt(count), denominator, 0);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
/** Correctly round `(value - origin) / (maximum - minimum)` for finite binary64 inputs. */
function exactBinary64AffineFraction(value, origin, minimum, maximum) {
	const denominator = finiteValueInMinSubnormalUnits(maximum) - finiteValueInMinSubnormalUnits(minimum);
	if (denominator <= 0n) throw new Error("exact binary64 affine fraction requires maximum > minimum");
	const rounded = roundRationalWithBinaryExponent(finiteValueInMinSubnormalUnits(value) - finiteValueInMinSubnormalUnits(origin), denominator, 0);
	return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

//#endregion
Object.defineProperty(exports, 'binary64RelativeDifferenceWithinEpsilons', {
  enumerable: true,
  get: function () {
    return binary64RelativeDifferenceWithinEpsilons;
  }
});
Object.defineProperty(exports, 'binary64RelativeDifferenceWithinTolerance', {
  enumerable: true,
  get: function () {
    return binary64RelativeDifferenceWithinTolerance;
  }
});
Object.defineProperty(exports, 'exactBinary64AffineFraction', {
  enumerable: true,
  get: function () {
    return exactBinary64AffineFraction;
  }
});
Object.defineProperty(exports, 'exactBinary64DivideByIntegerProduct', {
  enumerable: true,
  get: function () {
    return exactBinary64DivideByIntegerProduct;
  }
});
Object.defineProperty(exports, 'exactBinary64EmpiricalQuantileType7', {
  enumerable: true,
  get: function () {
    return exactBinary64EmpiricalQuantileType7;
  }
});
Object.defineProperty(exports, 'exactBinary64Mean', {
  enumerable: true,
  get: function () {
    return exactBinary64Mean;
  }
});
Object.defineProperty(exports, 'exactBinary64MultiplyByRational', {
  enumerable: true,
  get: function () {
    return exactBinary64MultiplyByRational;
  }
});
Object.defineProperty(exports, 'exactBinary64RatioToMean', {
  enumerable: true,
  get: function () {
    return exactBinary64RatioToMean;
  }
});
Object.defineProperty(exports, 'exactBinary64SampleStandardDeviation', {
  enumerable: true,
  get: function () {
    return exactBinary64SampleStandardDeviation;
  }
});
Object.defineProperty(exports, 'exactBinary64Sum', {
  enumerable: true,
  get: function () {
    return exactBinary64Sum;
  }
});
Object.defineProperty(exports, 'exactBinary64SumUnits', {
  enumerable: true,
  get: function () {
    return exactBinary64SumUnits;
  }
});
Object.defineProperty(exports, 'exactBinary64WeightedMean', {
  enumerable: true,
  get: function () {
    return exactBinary64WeightedMean;
  }
});
Object.defineProperty(exports, 'exactBinary64WeightedSum', {
  enumerable: true,
  get: function () {
    return exactBinary64WeightedSum;
  }
});
Object.defineProperty(exports, 'exactRationalToBinary64', {
  enumerable: true,
  get: function () {
    return exactRationalToBinary64;
  }
});
Object.defineProperty(exports, 'finiteBinary64ToMinSubnormalUnits', {
  enumerable: true,
  get: function () {
    return finiteBinary64ToMinSubnormalUnits;
  }
});
Object.defineProperty(exports, 'floorExactBinary64TimesSafeInteger', {
  enumerable: true,
  get: function () {
    return floorExactBinary64TimesSafeInteger;
  }
});
Object.defineProperty(exports, 'isRoundedMeanOfSafeNonnegativeIntegers', {
  enumerable: true,
  get: function () {
    return isRoundedMeanOfSafeNonnegativeIntegers;
  }
});
Object.defineProperty(exports, 'roundedBinary64Mean', {
  enumerable: true,
  get: function () {
    return roundedBinary64Mean;
  }
});
//# sourceMappingURL=exact-binary64-B9QJo1AS.cjs.map