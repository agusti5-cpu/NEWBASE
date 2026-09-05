const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Pure, side-effect-free v0.1 scoring primitives for OPVILO.
 * This module deliberately has no network, filesystem, or NEWBASE pipeline access.
 */
export function calculateScores({
  productFit = 0,
  demandStrength = 0,
  supplyStrength = 0,
  demandGrowth = 0,
  geographyFit = 0,
  commercialEvidence = 0,
  freshness = 0,
  sourceQuality = 0,
  viability = 0,
  risk = 100
} = {}) {
  const match = clamp(
    productFit * 0.25 +
    demandStrength * 0.20 +
    supplyStrength * 0.15 +
    demandGrowth * 0.10 +
    geographyFit * 0.10 +
    commercialEvidence * 0.10 +
    freshness * 0.05 +
    sourceQuality * 0.05
  );

  const confidence = clamp((freshness * 0.4) + (sourceQuality * 0.4) + (commercialEvidence * 0.2));
  const safeViability = clamp(viability);
  const safeRisk = clamp(risk);

  // High match cannot become exceptional when confidence/viability are weak or risk is high.
  let opportunity = clamp((match * 0.45) + (confidence * 0.20) + (safeViability * 0.25) - (safeRisk * 0.10));
  if (confidence < 70 || safeViability < 70) opportunity = Math.min(opportunity, 79);
  if (safeRisk >= 70) opportunity = Math.min(opportunity, 69);

  return { match, confidence, viability: safeViability, risk: safeRisk, opportunity };
}

export function classify(scores, { hasEvidence = false, participantVerified = false } = {}) {
  if (!hasEvidence || !participantVerified) return 'candidate';
  if (scores.risk >= 70 || scores.confidence < 70) return 'watch';
  if (scores.opportunity >= 90 && scores.confidence >= 90 && scores.viability >= 90 && scores.risk < 30) return 'exceptional';
  if (scores.opportunity >= 85) return 'priority';
  if (scores.opportunity >= 70) return 'watch';
  return 'rejected';
}

export function stableMatchId(offer, demand) {
  return [
    offer.entityId,
    offer.country,
    offer.productOrService,
    demand.entityId,
    demand.country,
    demand.productOrService
  ].map(value => String(value ?? '').trim().toLowerCase()).join('|');
}
