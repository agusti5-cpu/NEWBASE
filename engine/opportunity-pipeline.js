import { detectDemandTrend } from './demand.js';
import { evaluateOpportunity } from './opportunity-engine.js';

const VALID_SOURCE_TYPES = new Set(['official', 'api', 'feed', 'open_data', 'authorized']);
const VALID_LEGAL_STATUSES = new Set(['allowed', 'blocked', 'prohibited', 'unknown']);

/**
 * Existing demand detector kept as the first signal-producing stage.
 * It does not claim profitability or legal clearance.
 */
export function buildOpportunityCandidate(input) {
  const trend = detectDemandTrend(input.currentDemand, input.previousDemand, input.trendOptions);

  const legal = input.legal ?? {
    accessAuthorized: false,
    licenseReviewed: false,
    commercialUseAllowed: false,
    termsReviewed: false
  };

  const legalReady = Boolean(
    legal.accessAuthorized &&
    legal.licenseReviewed &&
    legal.commercialUseAllowed &&
    legal.termsReviewed
  );

  if (!trend.detected || !legalReady) {
    return {
      status: 'blocked',
      reason: !trend.detected ? 'no-meaningful-demand-trend' : 'legal-validation-required',
      trend,
      legal
    };
  }

  const score = Math.min(100, Math.round(50 + Math.min(40, trend.growthRate * 100) + 10));

  return {
    status: 'candidate',
    score,
    signal: 'demand-growth',
    trend,
    legal,
    profitability: 'unknown',
    requiresFurtherValidation: true
  };
}

/**
 * Validate the normalized NEWBASE opportunity contract before evaluation.
 */
export function validateOpportunity(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['CANDIDATE_MUST_BE_OBJECT'] };
  }

  for (const field of ['id', 'category', 'productOrService', 'originMarket', 'targetMarket', 'observedAt']) {
    if (typeof candidate[field] !== 'string' || candidate[field].trim() === '') {
      errors.push(`MISSING_${field.toUpperCase()}`);
    }
  }

  if (!candidate.source || typeof candidate.source !== 'object') {
    errors.push('MISSING_SOURCE');
  } else {
    if (typeof candidate.source.name !== 'string' || !candidate.source.name.trim()) {
      errors.push('MISSING_SOURCE_NAME');
    }
    if (!VALID_SOURCE_TYPES.has(candidate.source.type)) {
      errors.push('INVALID_SOURCE_TYPE');
    }
  }

  if (!candidate.signals || typeof candidate.signals !== 'object') {
    errors.push('MISSING_SIGNALS');
  } else {
    for (const field of ['demand', 'growth', 'marketGap', 'availability']) {
      const value = Number(candidate.signals[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push(`INVALID_SIGNAL_${field.toUpperCase()}`);
      }
    }
  }

  const confidence = Number(candidate.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push('INVALID_CONFIDENCE');
  }

  if (!candidate.legal || typeof candidate.legal !== 'object') {
    errors.push('MISSING_LEGAL_STATUS');
  } else if (!VALID_LEGAL_STATUSES.has(candidate.legal.status)) {
    errors.push('INVALID_LEGAL_STATUS');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Full decision path: validate -> legal gate -> confidence -> score.
 * Accepted and rejected evaluations retain the normalized candidate so the
 * publication layer never loses the evidence that produced the decision.
 */
export function processOpportunity(candidate, options = {}) {
  const validation = validateOpportunity(candidate);

  if (!validation.valid) {
    return {
      status: 'rejected',
      stage: 'validation',
      reason: 'INVALID_OPPORTUNITY',
      errors: validation.errors,
      score: 0,
      level: 'none',
      opportunity: candidate
    };
  }

  const evaluation = evaluateOpportunity(candidate, options);

  return {
    ...evaluation,
    stage: 'evaluation',
    opportunityId: candidate.id,
    opportunity: candidate
  };
}

export function processBatch(candidates, options = {}) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map((candidate) => processOpportunity(candidate, options));
}
