/**
 * Compact display of a calculated number: a fixed count of significant figures,
 * switching to exponent notation only when the plain form would be unreadable.
 * The output is also a valid value for <input type="number">.
 */
export function formatSig(value: number, sig = 5): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e12 || abs < 1e-4) return value.toExponential(Math.max(0, sig - 1));
  return String(Number(value.toPrecision(sig)));
}
