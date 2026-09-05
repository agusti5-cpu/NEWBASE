import { normalizeDemand } from './demand-normalizer.js';

/**
 * Turn independent procurement evidence into an observation-only opportunity.
 * No publishing, contacting, purchasing, or source mutation is permitted.
 */
export function observeOpportunity({ offer, demandEvidence }) {
  if (!offer || !demandEvidence) return null;

  const normalizedInput = {
    opportunityId: demandEvidence.publicationNumber ?? demandEvidence.opportunityId ?? demandEvidence.id,
    targetMarket: demandEvidence.country ?? demandEvidence.targetMarket ?? 'ES',
    productOrService: demandEvidence.productOrService ?? demandEvidence.title ?? '',
    signals: {
      demand: demandEvidence.signals?.demand ?? demandEvidence.demandScore ?? 0,
      growth: demandEvidence.signals?.growth ?? 0
    }
  };

  const demand = normalizeDemand(normalizedInput);
  if (!demand) return null;

  const demandScore = Math.max(0, Math.min(100, Number(demand.signals.demand || 0)));
  const fitScore = calculateFitScore(offer, demand);
  const opportunityScore = Math.round((demandScore * 0.6) + (fitScore * 0.4));

  return {
    mode: 'observationOnly',
    source: 'eu-ted-procurement',
    offerId: offer.id ?? null,
    demandId: demand.entityId,
    country: demand.country,
    productOrService: demand.productOrService,
    fitScore,
    demandScore,
    opportunityScore,
    participantVerified: false,
    actionAllowed: false
  };
}

function calculateFitScore(offer, demand) {
  const offerText = `${offer.title || ''} ${offer.description || ''} ${offer.productOrService || ''}`.toLowerCase();
  const demandText = demand.productOrService.toLowerCase();
  const terms = [...new Set(demandText.split(/\s+/).filter((term) => term.length >= 4))];
  if (!terms.length) return 0;
  const hits = terms.filter((term) => offerText.includes(term)).length;
  return Math.round((hits / terms.length) * 100);
}
