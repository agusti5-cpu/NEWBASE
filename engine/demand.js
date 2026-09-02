/**
 * NEWBASE demand signal engine.
 * Compares current and previous observations and emits a signal only
 * when the change is meaningful. No commercial claim is inferred.
 */

export function detectDemandTrend(current, previous, options = {}) {
  const minRelativeGrowth = Number(options.minRelativeGrowth ?? 0.20);
  const minAbsoluteGrowth = Number(options.minAbsoluteGrowth ?? 10);

  const now = toFiniteNumber(current);
  const before = toFiniteNumber(previous);

  if (now === null || before === null || before < 0) {
    return {
      detected: false,
      direction: 'unknown',
      growthRate: null,
      reason: 'invalid-observations'
    };
  }

  const delta = now - before;
  const growthRate = before === 0 ? (now > 0 ? Infinity : 0) : delta / before;
  const detected = delta >= minAbsoluteGrowth && growthRate >= minRelativeGrowth;

  return {
    detected,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    current: now,
    previous: before,
    delta,
    growthRate,
    reason: detected ? 'meaningful-growth' : 'below-threshold'
  };
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
