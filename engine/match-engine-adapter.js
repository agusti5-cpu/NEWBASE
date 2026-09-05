import { calculateScores, classify, stableMatchId } from '../src/match-engine/index.js';

/**
 * Controlled NEWBASE adapter for the isolated OPVILO Match Engine.
 *
 * The legacy opportunity pipeline remains unchanged. This adapter is opt-in:
 * callers must explicitly provide both offer and demand records and decide
 * whether to use the returned recommendation.
 */
export function evaluateMatch(offer, demand, options = {}) {
  const scores = calculateScores({
    productFit: options.productFit ?? offer?.signals?.productFit ?? offer?.signals?.marketGap ?? 0,
    demandStrength: options.demandStrength ?? demand?.signals?.demand ?? 0,
    supplyStrength: options.supplyStrength ?? offer?.signals?.availability ?? 0,
    demandGrowth: options.demandGrowth ?? demand?.signals?.growth ?? 0,
    geographyFit: options.geographyFit ?? 0,
    commercialEvidence: options.commercialEvidence ?? offer?.signals?.commercialEvidence ?? 0,
    freshness: options.freshness ?? offer?.signals?.freshness ?? 0,
    sourceQuality: options.sourceQuality ?? offer?.signals?.sourceQuality ?? 0,
    viability: options.viability ?? offer?.viability ?? 0,
    risk: options.risk ?? offer?.risk ?? 100
  });

  const classification = classify(scores, {
    hasEvidence: options.hasEvidence ?? Boolean(offer && demand),
    participantVerified: options.participantVerified ?? false
  });

  return {
    matchId: stableMatchId(offer ?? {}, demand ?? {}),
    scores,
    classification
  };
}

export function attachMatchEvaluation(opportunity, offer, demand, options = {}) {
  const evaluation = evaluateMatch(offer, demand, options);
  return {
    ...opportunity,
    matchEvaluation: evaluation
  };
}
