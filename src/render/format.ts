/**
 * Deterministic, locale-independent formatting for the normative SVG.
 *
 * The SVG byte sequence is normative and hashed, so nothing here may depend on the host
 * locale, the timezone, or the browser's number formatting. `Intl.NumberFormat` would
 * produce different bytes in a German locale (`1,5` vs `1.5`); `toLocaleString` is
 * banned for the same reason. `-0` is normalized to `0` because canonical JSON does not
 * distinguish them and a `-0` in the SVG would make two identical figures hash two ways.
 */

/** A number for display. Fixed significant digits, no locale, no signed zero. */
export function formatNumber(value: number, significantDigits = 6): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0 || Object.is(value, -0)) return '0';

  const magnitude = Math.abs(value);

  // Scientific notation outside a fixed window, so a very large or very small tick label
  // does not become an unreadable run of zeros. The thresholds are fixed, never
  // locale-derived.
  if (magnitude >= 1e6 || magnitude < 1e-4) {
    return trimExponential(value.toExponential(Math.max(0, significantDigits - 1)));
  }

  // toPrecision then strip trailing zeros, so 1.50 renders as 1.5 but 1.005 keeps its
  // precision. Number() re-parse collapses "1.500000" deterministically.
  const precise = value.toPrecision(significantDigits);
  const trimmed = Number(precise).toString();
  return trimmed === '-0' ? '0' : trimmed;
}

function trimExponential(text: string): string {
  // "1.500e+2" -> "1.5e+2". The exponent is left intact.
  const [mantissa, exponent] = text.split('e');
  const trimmedMantissa = mantissa.includes('.')
    ? mantissa.replace(/0+$/, '').replace(/\.$/, '')
    : mantissa;
  return `${trimmedMantissa}e${exponent}`;
}

/** A coordinate, rounded to a fixed number of decimals so the SVG path bytes are stable. */
export function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) return '0';
  // 3 decimals is sub-pixel and enough for any figure at these sizes; more would only add
  // nondeterministic trailing digits from binary64.
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded === 0 || Object.is(rounded, -0)) return '0';
  const text = rounded.toString();
  return text === '-0' ? '0' : text;
}

/** A value with its unit label appended, e.g. `250 Hz`. An empty unit adds nothing. */
export function formatWithUnit(value: number, unitLabel: string, significantDigits = 6): string {
  const number = formatNumber(value, significantDigits);
  return unitLabel ? `${number} ${unitLabel}` : number;
}
