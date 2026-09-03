/**
 * NEWBASE — Opportunity Engine
 *
 * Pure, dependency-free scoring engine.
 * It does not fetch data, scrape platforms or make legal assumptions.
 * Connectors provide normalized opportunity candidates; this engine decides
 * whether a candidate can proceed and assigns a deterministic score.
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

  // `unknown` means that the source does not provide a product-level legal
  // clearance. It must never be turned into `allowed` by inference. It is,
  // however, safe to continue when the opportunity is explicitly presented
  // as an informational market signal; publication carries the same status.
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
  const demand = clamp(candidate?.signals?.demand);
  const growth = clamp(candidate?.signals?.growth);
  const marketGap = clamp(candidate?.signals?.marketGap);
  const availability = clamp(candidate?.signals?.availability);
  const confidence = confidenceToScore(candidate?.confidence ?? 0);

  const score = Math.round(
    demand * 0.25 +
    growth * 0.20 +
    marketGap * 0.20 +
    availability * 0.15 +
    confidence * 0.20
  );

  return clamp(score);
}

export function evaluateOpportunity(candidate, options = {}) {
  const minScore = Number.isFinite(options.minScore)
    ? options.minScore
    : DEFAULTS.minScore;
  const minConfidence = Number.isFinite(options.minConfidence)
    ? options.minConfidence
    : DEFAULTS.minConfidence;

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
