const { normalizeDemand } = require('./demand-normalizer');

/**
 * Convert independent demand evidence into an observation-only opportunity.
 * This module deliberately has no side effects: it never publishes, contacts,
 * purchases, or mutates source records.
 */
function observeOpportunity({ offer, demandEvidence }) {
  if (!offer || !demandEvidence) return null;

  const demand = normalizeDemand(demandEvidence);
  if (!demand || demand.participantVerified !== false) return null;

  const demandScore = Math.max(0, Math.min(100, Number(demand.score || 0)));
  const fitScore = calculateFitScore(offer, demand);
  const opportunityScore = Math.round((demandScore * 0.6) + (fitScore * 0.4));

  return {
    mode: 'observationOnly',
    source: demand.source,
    offerId: offer.id ?? null,
    demandId: demand.id ?? null,
    fitScore,
    demandScore,
    opportunityScore,
    participantVerified: false,
    actionAllowed: false
  };
}

function calculateFitScore(offer, demand) {
  const offerText = `${offer.title || ''} ${offer.description || ''}`.toLowerCase();
  const demandText = `${demand.title || ''} ${demand.description || ''}`.toLowerCase();
  const terms = [...new Set((demand.keywords || []).map(String).map(s => s.toLowerCase()).filter(Boolean))];
  if (!terms.length) return 0;
  const hits = terms.filter(term => offerText.includes(term) || demandText.includes(term)).length;
  return Math.round((hits / terms.length) * 100);
}

module.exports = { observeOpportunity, calculateFitScore };
