/**
 * NEWBASE — Opportunity Engine
 *
 * Deterministic scoring engine. Missing commercial signals are not treated as
 * negative evidence: the score is calculated from the signals actually
 * supplied by the source, while publication still requires traceable evidence.
 */

export const DEFAULTS = Object.freeze({
  minScore: 60,
  minConfidence: 0.6,
});

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function confidenceToScore(value) {
  return clamp(Number(value) * 100);
}

function legalStatus(candidate) {
  const legal = candidate?.legal;
  if (!legal || legal.status === 'unknown') {
    return { allowed: true, reason: 'LEGAL_STATUS_UNKNOWN_INFORMATIONAL' };
  }
  if (legal.status === 'blocked' || legal.status === 'prohibited') {
    return { allowed: false, reason: 'LEGAL_BLOCK' };
  }
  if (legal.status !== 'allowed') {
    return { allowed: false, reason: 'LEGAL_REVIEW_REQUIRED' };
  }
  return { allowed: true, reason: null };
}

export function scoreCandidate(candidate) {
  const signals = candidate?.signals ?? {};
  const values = [
    ['demand', signals.demand, 0.25],
    ['growth', signals.growth, 0.20],
    ['marketGap', signals.marketGap, 0.20],
    ['availability', signals.availability, 0.15],
    ['confidence', confidenceToScore(candidate?.confidence ?? 0), 0.20],
  ];

  const known = values.filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);
  if (!known.length) return 0;

  const weightTotal = known.reduce((sum, [, , weight]) => sum + weight, 0);
  const weighted = known.reduce((sum, [, value, weight]) => sum + clamp(value) * weight, 0);
  return clamp(Math.round(weighted / weightTotal));
}

export function evaluateOpportunity(candidate, options = {}) {
  const minScore = Number.isFinite(options.minScore) ? options.minScore : DEFAULTS.minScore;
  const minConfidence = Number.isFinite(options.minConfidence) ? options.minConfidence : DEFAULTS.minConfidence;

  if (!candidate || typeof candidate !== 'object') {
    return { status: 'rejected', reason: 'INVALID_CANDIDATE', score: 0, level: 'none' };
  }

  const legal = legalStatus(candidate);
  if (!legal.allowed) {
    return { status: 'rejected', reason: legal.reason, score: 0, level: 'none' };
  }

  const confidence = Number(candidate.confidence ?? 0);
  if (!Number.isFinite(confidence) || confidence < minConfidence) {
    return { status: 'rejected', reason: 'LOW_CONFIDENCE', score: 0, level: 'none' };
  }

  const score = scoreCandidate(candidate);
  const status = score >= minScore ? 'accepted' : 'rejected';
  let level = 'none';
  if (score >= 85) level = 'high';
  else if (score >= 70) level = 'medium';
  else if (score >= minScore) level = 'low';

  return {
    status,
    reason: status === 'accepted' ? 'QUALITY_THRESHOLD_MET' : 'SCORE_BELOW_THRESHOLD',
    score,
    level,
    legalStatus: candidate.legal?.status ?? 'unknown',
  };
}

export default { scoreCandidate, evaluateOpportunity };
