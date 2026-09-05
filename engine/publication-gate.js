/**
 * NEWBASE publication gate.
 *
 * Evaluation and publication are intentionally separate. An accepted score is
 * not enough to publish: the candidate must retain source evidence, the
 * evidence must be traceable, and commercial claims require corroboration.
 */

import { validateCommercialEvidence } from './commercial-validation.js';

const REQUIRED_EVIDENCE = Object.freeze([
  'sourceUrl',
  'sourceName',
  'observedAt',
  'summary',
]);

export function validatePublicationEvidence(opportunity) {
  const errors = [];
  const evidence = opportunity?.evidence;

  if (!evidence || typeof evidence !== 'object') {
    return { valid: false, errors: ['MISSING_EVIDENCE'] };
  }

  for (const field of REQUIRED_EVIDENCE) {
    if (typeof evidence[field] !== 'string' || !evidence[field].trim()) {
      errors.push(`MISSING_EVIDENCE_${field.toUpperCase()}`);
    }
  }

  if (typeof evidence.sourceUrl === 'string') {
    try {
      const url = new URL(evidence.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push('INVALID_EVIDENCE_URL');
    } catch {
      errors.push('INVALID_EVIDENCE_URL');
    }
  }

  if (evidence.sourceName && opportunity?.source?.name && evidence.sourceName !== opportunity.source.name) {
    errors.push('EVIDENCE_SOURCE_MISMATCH');
  }
  if (evidence.observedAt && opportunity?.observedAt && evidence.observedAt !== opportunity.observedAt) {
    errors.push('EVIDENCE_TIMESTAMP_MISMATCH');
  }

  return { valid: errors.length === 0, errors };
}

export function preparePublication(result) {
  const opportunity = result?.opportunity;

  // Preserve the public contract for non-accepted evaluation results. They
  // are terminal at this gate and must never be turned into publication
  // candidates or carry extra fields that alter downstream deep equality.
  if (!result || result.status !== 'accepted') {
    return {
      status: 'not_publishable',
      reason: 'OPPORTUNITY_NOT_ACCEPTED',
    };
  }

  // Observation-only signals are evidence for internal evaluation, not public
  // opportunities. Keep this invariant at the final publication boundary so a
  // future scoring or review change cannot accidentally expose them.
  if (opportunity?.observationOnly === true) {
    return {
      status: 'not_publishable',
      reason: 'OBSERVATION_ONLY_NOT_PUBLISHABLE',
      opportunityId: opportunity?.id ?? result.opportunityId ?? null,
    };
  }

  const evidence = validatePublicationEvidence(opportunity);
  if (!evidence.valid) {
    return {
      status: 'not_publishable',
      reason: 'PUBLICATION_EVIDENCE_REQUIRED',
      errors: evidence.errors,
      opportunityId: opportunity?.id ?? result.opportunityId ?? null,
      opportunity,
    };
  }

  const commercial = validateCommercialEvidence(opportunity);
  if (!commercial.valid) {
    return {
      status: 'not_publishable',
      reason: 'COMMERCIAL_VALIDATION_REQUIRED',
      errors: commercial.errors,
      opportunityId: opportunity?.id ?? result.opportunityId ?? null,
      opportunity,
    };
  }

  return {
    status: 'publishable',
    opportunityId: opportunity.id,
    score: result.score,
    level: result.level,
    category: opportunity.category,
    productOrService: opportunity.productOrService,
    originMarket: opportunity.originMarket,
    targetMarket: opportunity.targetMarket,
    source: opportunity.source,
    observedAt: opportunity.observedAt,
    evidence: opportunity.evidence,
    commercialValidation: opportunity.commercialValidation,
    opportunity,
  };
}
