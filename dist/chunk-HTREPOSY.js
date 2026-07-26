// src/core/exact-binary64.ts
var FRACTION_BITS = 52n;
var FRACTION_MASK = (1n << FRACTION_BITS) - 1n;
var HIDDEN_BIT = 1n << FRACTION_BITS;
var SIGN_BIT = 1n << 63n;
var scratch = new DataView(new ArrayBuffer(8));
function finiteValueInMinSubnormalUnits(value) {
  if (!Number.isFinite(value)) throw new Error("exact binary64 accumulation requires finite values");
  scratch.setFloat64(0, value, false);
  const bits = scratch.getBigUint64(0, false);
  const negative = (bits & SIGN_BIT) !== 0n;
  const exponentBits = Number(bits >> FRACTION_BITS & 0x7ffn);
  const fraction = bits & FRACTION_MASK;
  if (exponentBits === 0 && fraction === 0n) return 0n;
  const mantissa = exponentBits === 0 ? fraction : HIDDEN_BIT + fraction;
  const shift = exponentBits === 0 ? 0n : BigInt(exponentBits - 1);
  const units = mantissa << shift;
  return negative ? -units : units;
}
function finiteBinary64ToMinSubnormalUnits(value) {
  return finiteValueInMinSubnormalUnits(value);
}
function bitLength(value) {
  return value === 0n ? 0 : value.toString(2).length;
}
function roundedQuotientEven(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const doubled = remainder << 1n;
  if (doubled > denominator || doubled === denominator && (quotient & 1n) === 1n) {
    return quotient + 1n;
  }
  return quotient;
}
function binary64FromBits(bits) {
  scratch.setBigUint64(0, bits, false);
  return scratch.getFloat64(0, false);
}
function floorBinaryLogarithmOfRational(numerator, denominator) {
  let exponent = bitLength(numerator) - bitLength(denominator);
  const numeratorAtExponent = exponent >= 0 ? denominator << BigInt(exponent) : denominator;
  const denominatorAtExponent = exponent >= 0 ? numerator : numerator << BigInt(-exponent);
  if (denominatorAtExponent < numeratorAtExponent) exponent--;
  return exponent;
}
function roundedScaledQuotient(numerator, denominator, binaryShift) {
  return binaryShift >= 0 ? roundedQuotientEven(numerator << BigInt(binaryShift), denominator) : roundedQuotientEven(numerator, denominator << BigInt(-binaryShift));
}
function roundRationalWithBinaryExponent(signedNumerator, denominator, binaryExponent) {
  if (denominator <= 0n) throw new Error("exact binary64 denominator must be positive");
  if (signedNumerator === 0n) return { value: 0, exactNonZero: false };
  const negative = signedNumerator < 0n;
  const numerator = negative ? -signedNumerator : signedNumerator;
  let exponentBits;
  let fraction;
  let valueExponent = floorBinaryLogarithmOfRational(numerator, denominator) + binaryExponent;
  if (valueExponent < -1022) {
    const subnormal = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 1074
    );
    if (subnormal === 0n) return { value: negative ? -0 : 0, exactNonZero: true };
    if (subnormal >= HIDDEN_BIT) {
      exponentBits = 1;
      fraction = 0n;
    } else {
      exponentBits = 0;
      fraction = subnormal;
    }
  } else {
    let mantissa = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 52 - valueExponent
    );
    if (mantissa === HIDDEN_BIT << 1n) {
      mantissa >>= 1n;
      valueExponent++;
    }
    exponentBits = valueExponent + 1023;
    if (exponentBits >= 2047) {
      throw new Error("exact binary64 result overflows the finite range");
    }
    fraction = mantissa - HIDDEN_BIT;
  }
  const bits = (negative ? SIGN_BIT : 0n) | BigInt(exponentBits) << FRACTION_BITS | fraction;
  return { value: binary64FromBits(bits), exactNonZero: true };
}
function comparePositiveRationalToPowerOfTwo(numerator, denominator, binaryExponent) {
  const left = binaryExponent < 0 ? numerator << BigInt(-binaryExponent) : numerator;
  const right = binaryExponent < 0 ? denominator : denominator << BigInt(binaryExponent);
  return left < right ? -1 : left > right ? 1 : 0;
}
function floorBinaryLogarithmOfSquareRootRational(numerator, denominator) {
  let exponent = Math.floor((bitLength(numerator) - bitLength(denominator)) / 2);
  while (comparePositiveRationalToPowerOfTwo(
    numerator,
    denominator,
    2 * exponent
  ) < 0) exponent--;
  while (comparePositiveRationalToPowerOfTwo(
    numerator,
    denominator,
    2 * (exponent + 1)
  ) >= 0) exponent++;
  return exponent;
}
function integerSquareRootFloor(value) {
  if (value < 0n) throw new Error("integer square root requires a non-negative value");
  if (value < 2n) return value;
  let estimate = 1n << BigInt(Math.ceil(bitLength(value) / 2));
  for (; ; ) {
    const next = estimate + value / estimate >> 1n;
    if (next >= estimate) return estimate;
    estimate = next;
  }
}
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
function roundSquareRootRationalWithBinaryExponent(numerator, denominator, binaryExponent) {
  if (numerator < 0n) throw new Error("exact binary64 square root requires a non-negative numerator");
  if (denominator <= 0n) throw new Error("exact binary64 square-root denominator must be positive");
  if (numerator === 0n) return { value: 0, exactNonZero: false };
  let valueExponent = floorBinaryLogarithmOfSquareRootRational(numerator, denominator) + binaryExponent;
  let exponentBits;
  let fraction;
  if (valueExponent < -1022) {
    const subnormal = roundedSquareRootScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 1074
    );
    if (subnormal === 0n) return { value: 0, exactNonZero: true };
    if (subnormal >= HIDDEN_BIT) {
      exponentBits = 1;
      fraction = 0n;
    } else {
      exponentBits = 0;
      fraction = subnormal;
    }
  } else {
    let mantissa = roundedSquareRootScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 52 - valueExponent
    );
    if (mantissa === HIDDEN_BIT << 1n) {
      mantissa >>= 1n;
      valueExponent++;
    }
    exponentBits = valueExponent + 1023;
    if (exponentBits >= 2047) {
      throw new Error("exact binary64 square-root result overflows the finite range");
    }
    fraction = mantissa - HIDDEN_BIT;
  }
  return {
    value: binary64FromBits(BigInt(exponentBits) << FRACTION_BITS | fraction),
    exactNonZero: true
  };
}
function exactBinary64MeanResult(values) {
  if (values.length === 0) throw new Error("exact binary64 mean requires at least one value");
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  return roundRationalWithBinaryExponent(numerator, BigInt(values.length), -1074);
}
function roundedBinary64Mean(values) {
  const rounded = exactBinary64MeanResult(values);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64Mean(values) {
  const rounded = exactBinary64MeanResult(values);
  if (rounded.exactNonZero && rounded.value === 0) {
    throw new Error("exact binary64 mean underflows to zero");
  }
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64EmpiricalQuantileType7(values, probability) {
  if (values.length === 0) {
    throw new Error("exact binary64 Type-7 quantile requires at least one value");
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("exact binary64 Type-7 quantile probability must be finite and lie in [0, 1]");
  }
  const ordered = values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("exact binary64 Type-7 quantile requires finite values");
    }
    return value === 0 ? 0 : value;
  }).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  if (ordered.length === 1) return ordered[0];
  const denominator = 1n << 1074n;
  const scaledPosition = finiteValueInMinSubnormalUnits(probability === 0 ? 0 : probability) * BigInt(ordered.length - 1);
  const lowerIndex = Number(scaledPosition / denominator);
  const fractionNumerator = scaledPosition % denominator;
  if (lowerIndex === ordered.length - 1 || fractionNumerator === 0n) {
    return ordered[lowerIndex];
  }
  const lower = finiteValueInMinSubnormalUnits(ordered[lowerIndex]);
  const upper = finiteValueInMinSubnormalUnits(ordered[lowerIndex + 1]);
  const numerator = lower * (denominator - fractionNumerator) + upper * fractionNumerator;
  return finiteNonzeroRoundedResult(
    roundRationalWithBinaryExponent(numerator, denominator, -1074),
    "Type-7 quantile"
  );
}
function exactBinary64SampleVarianceRatio(values) {
  if (values.length < 2) {
    throw new Error("exact binary64 sample variance requires at least two values");
  }
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
  if (numerator < 0n) {
    throw new Error("exact binary64 sample variance invariant was violated");
  }
  return {
    numerator,
    denominator: count * (count - 1n),
    count
  };
}
function exactBinary64SampleStandardDeviation(values) {
  const variance = exactBinary64SampleVarianceRatio(values);
  if (variance.numerator === 0n) return 0;
  return finiteNonzeroRoundedResult(
    roundSquareRootRationalWithBinaryExponent(
      variance.numerator,
      variance.denominator,
      -1074
    ),
    "sample standard deviation"
  );
}
function isRoundedMeanOfSafeNonnegativeIntegers(value, count) {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(count) || count < 1) return false;
  const canonicalValue = value === 0 ? 0 : value;
  const scaledUnits = finiteValueInMinSubnormalUnits(canonicalValue) * BigInt(count);
  const denominator = 1n << 1074n;
  const floorTotal = scaledUnits / denominator;
  const maximumTotal = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(count);
  for (const total of [floorTotal, floorTotal + 1n]) {
    if (total < 0n || total > maximumTotal) continue;
    if (exactRationalToBinary64(total, BigInt(count)) === canonicalValue) return true;
  }
  return false;
}
function floorExactBinary64TimesSafeInteger(value, factor) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("exact floor product requires a finite non-negative binary64 value");
  }
  if (!Number.isSafeInteger(factor) || factor < 0) {
    throw new Error("exact floor product requires a non-negative safe-integer factor");
  }
  const productUnits = finiteValueInMinSubnormalUnits(value) * BigInt(factor);
  const quotient = productUnits / (1n << 1074n);
  if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("exact floor product exceeds the safe-integer range");
  }
  return Number(quotient);
}
function exactBinary64Sum(values) {
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  const rounded = roundRationalWithBinaryExponent(numerator, 1n, -1074);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactWeightedProductSum(values, weights) {
  if (values.length === 0 || values.length !== weights.length) {
    throw new Error("exact binary64 weighted aggregate requires equal non-empty value and weight arrays");
  }
  let numerator = 0n;
  let weightSum = 0n;
  for (let index = 0; index < values.length; index++) {
    const valueUnits = finiteValueInMinSubnormalUnits(values[index]);
    const weightUnits = finiteValueInMinSubnormalUnits(weights[index]);
    if (weightUnits <= 0n) {
      throw new Error("exact binary64 weighted aggregate requires finite positive weights");
    }
    numerator += valueUnits * weightUnits;
    weightSum += weightUnits;
  }
  return { numerator, weightSum };
}
function finiteNonzeroRoundedResult(rounded, noun) {
  if (rounded.exactNonZero && rounded.value === 0) {
    throw new Error(`exact binary64 ${noun} underflows to zero`);
  }
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64WeightedSum(values, weights) {
  const aggregate = exactWeightedProductSum(values, weights);
  return finiteNonzeroRoundedResult(
    roundRationalWithBinaryExponent(aggregate.numerator, 1n, -2148),
    "weighted sum"
  );
}
function exactBinary64WeightedMean(values, weights) {
  const aggregate = exactWeightedProductSum(values, weights);
  return finiteNonzeroRoundedResult(
    roundRationalWithBinaryExponent(aggregate.numerator, aggregate.weightSum, -1074),
    "weighted mean"
  );
}
function exactRationalToBinary64(numerator, denominator, binaryExponent = 0) {
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, binaryExponent);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64MultiplyByRational(value, numerator, denominator, binaryExponent = 0) {
  return exactRationalToBinary64(
    finiteValueInMinSubnormalUnits(value) * numerator,
    denominator,
    binaryExponent - 1074
  );
}
function exactBinary64DivideByIntegerProduct(numerator, integerFactor, denominatorValue) {
  if (!Number.isFinite(numerator)) {
    throw new Error("exact binary64 quotient requires a finite numerator");
  }
  if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) {
    throw new Error("exact binary64 quotient requires a positive safe-integer factor");
  }
  if (!Number.isFinite(denominatorValue) || !(denominatorValue > 0)) {
    throw new Error("exact binary64 quotient requires a finite positive denominator value");
  }
  const numeratorUnits = finiteValueInMinSubnormalUnits(numerator);
  const denominatorUnits = BigInt(integerFactor) * finiteValueInMinSubnormalUnits(denominatorValue);
  const result = exactRationalToBinary64(numeratorUnits, denominatorUnits);
  if (numeratorUnits !== 0n && result === 0) {
    throw new Error("exact binary64 quotient underflows to zero");
  }
  return result;
}
function binary64RelativeDifferenceWithinEpsilons(left, right, epsilonMultiples) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isSafeInteger(epsilonMultiples) || epsilonMultiples < 0) return false;
  const leftUnits = finiteValueInMinSubnormalUnits(left);
  const rightUnits = finiteValueInMinSubnormalUnits(right);
  const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
  const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
  const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
  if (scale === 0n) return true;
  const difference = leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits;
  return difference << 52n <= BigInt(epsilonMultiples) * scale;
}
function binary64RelativeDifferenceWithinTolerance(left, right, relativeTolerance) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(relativeTolerance) || relativeTolerance < 0) return false;
  const leftUnits = finiteValueInMinSubnormalUnits(left);
  const rightUnits = finiteValueInMinSubnormalUnits(right);
  const toleranceUnits = finiteValueInMinSubnormalUnits(relativeTolerance);
  const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
  const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
  const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
  if (scale === 0n) return true;
  const difference = leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits;
  return difference << 1074n <= scale * toleranceUnits;
}
function exactBinary64SumUnits(values) {
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  return numerator.toString(10);
}
function exactBinary64RatioToMean(value, exactSumUnits, count) {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("exact binary64 mean ratio requires a positive safe-integer count");
  }
  const denominator = BigInt(exactSumUnits);
  if (denominator <= 0n) {
    throw new Error("exact binary64 mean ratio requires a strictly positive exact mean");
  }
  const numerator = finiteValueInMinSubnormalUnits(value) * BigInt(count);
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, 0);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64AffineFraction(value, origin, minimum, maximum) {
  const denominator = finiteValueInMinSubnormalUnits(maximum) - finiteValueInMinSubnormalUnits(minimum);
  if (denominator <= 0n) throw new Error("exact binary64 affine fraction requires maximum > minimum");
  const numerator = finiteValueInMinSubnormalUnits(value) - finiteValueInMinSubnormalUnits(origin);
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, 0);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64RatioToDifference(value, minimum, maximum) {
  const denominator = finiteValueInMinSubnormalUnits(maximum) - finiteValueInMinSubnormalUnits(minimum);
  if (denominator <= 0n) {
    throw new Error("exact binary64 ratio to difference requires maximum > minimum");
  }
  const numerator = finiteValueInMinSubnormalUnits(value);
  return finiteNonzeroRoundedResult(
    roundRationalWithBinaryExponent(numerator, denominator, 0),
    "ratio to difference"
  );
}

export {
  finiteBinary64ToMinSubnormalUnits,
  roundedBinary64Mean,
  exactBinary64Mean,
  exactBinary64EmpiricalQuantileType7,
  exactBinary64SampleStandardDeviation,
  isRoundedMeanOfSafeNonnegativeIntegers,
  floorExactBinary64TimesSafeInteger,
  exactBinary64Sum,
  exactBinary64WeightedSum,
  exactBinary64WeightedMean,
  exactRationalToBinary64,
  exactBinary64MultiplyByRational,
  exactBinary64DivideByIntegerProduct,
  binary64RelativeDifferenceWithinEpsilons,
  binary64RelativeDifferenceWithinTolerance,
  exactBinary64SumUnits,
  exactBinary64RatioToMean,
  exactBinary64AffineFraction,
  exactBinary64RatioToDifference
};
//# sourceMappingURL=chunk-HTREPOSY.js.map