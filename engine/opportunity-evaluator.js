import { evaluateOpportunity } from './opportunity-engine.js';

const SOURCE_TYPES = new Set(['official', 'api', 'feed', 'open_data', 'authorized']);
const LEGAL_STATUSES = new Set(['allowed', 'blocked', 'prohibited', 'unknown']);
const REQUIRED_FIELDS = [
  'id',
  'category',
  'productOrService',
  'originMarket',
  'targetMarket',
  'observedAt'
];
const SIGNAL_FIELDS = ['demand', 'growth', 'marketGap', 'availability'];

export function validateNormalizedOpportunity(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['CANDIDATE_MUST_BE_OBJECT'] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (typeof candidate[field] !== 'string' || !candidate[field].trim()) {
      errors.push(`MISSING_${field.toUpperCase()}`);
    }
  }

  if (!candidate.source || typeof candidate.source !== 'object') {
    errors.push('MISSING_SOURCE');
  } else {
    if (typeof candidate.source.name !== 'string' || !candidate.source.name.trim()) {
      errors.push('MISSING_SOURCE_NAME');
    }
    if (!SOURCE_TYPES.has(candidate.source.type)) {
      errors.push('INVALID_SOURCE_TYPE');
    }
  }

  if (!candidate.signals || typeof candidate.signals !== 'object') {
    errors.push('MISSING_SIGNALS');
  } else {
    for (const field of SIGNAL_FIELDS) {
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
  } else if (!LEGAL_STATUSES.has(candidate.legal.status)) {
    errors.push('INVALID_LEGAL_STATUS');
  }

  return { valid: errors.length === 0, errors };
}

export function evaluateNormalizedOpportunity(candidate, options = {}) {
  const validation = validateNormalizedOpportunity(candidate);

  if (!validation.valid) {
    return {
      status: 'rejected',
      stage: 'validation',
      reason: 'INVALID_OPPORTUNITY',
      errors: validation.errors,
      score: 0,
      level: 'none'
    };
  }

  return {
    ...evaluateOpportunity(candidate, options),
    stage: 'evaluation',
    opportunityId: candidate.id
  };
}

export function evaluateNormalizedBatch(candidates, options = {}) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map((candidate) => evaluateNormalizedOpportunity(candidate, options));
}
