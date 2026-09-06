import { evaluateMatch } from '../../engine/match-engine-adapter.js';

const ALIASES = new Map([
  ['solar panel', 'solar-panels'],
  ['solar panels', 'solar-panels'],
  ['panneaux solaires', 'solar-panels'],
  ['paneles solares', 'solar-panels'],
  ['olive oil', 'olive-oil'],
  ['aceite de oliva', 'olive-oil'],
  ['huile dolive', 'olive-oil'],
  ['static converter', 'static-converters'],
  ['static converters', 'static-converters'],
  ['convertidores estaticos', 'static-converters'],
  ['convertisseurs statiques', 'static-converters']
]);

const text = value => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function normalizeProduct(value) {
  const normalized = text(value);
  return ALIASES.get(normalized) || normalized.replace(/\s+/g, '-');
}

function compatibleProducts(a, b) {
  return normalizeProduct(a) === normalizeProduct(b);
}

function geographyScore(offer, demand) {
  const origin = text(offer?.country).toUpperCase();
  const target = text(demand?.country).toUpperCase();
  if (!origin || !target) return 0;
  return origin === target ? 60 : 100;
}

/**
 * Pure global candidate generation. It consumes explicit offer/demand records
 * and never reads, writes, or invokes the NEWBASE production detector.
 */
export function generateMatchCandidates(offers = [], demands = [], options = {}) {
  const candidates = [];
  const seen = new Set();

  for (const rawOffer of offers) {
    for (const rawDemand of demands) {
      if (!rawOffer || !rawDemand) continue;
      if (!rawOffer.entityId || !rawDemand.entityId) continue;
      if (String(rawOffer.entityId) === String(rawDemand.entityId)) continue;
      if (!compatibleProducts(rawOffer.productOrService, rawDemand.productOrService)) continue;

      const offer = { ...rawOffer, productOrService: normalizeProduct(rawOffer.productOrService) };
      const demand = { ...rawDemand, productOrService: normalizeProduct(rawDemand.productOrService) };
      const geographyFit = options.geographyFit ?? geographyScore(offer, demand);
      const evaluation = evaluateMatch(offer, demand, {
        ...options,
        geographyFit,
        participantVerified: options.participantVerified ?? false
      });

      if (seen.has(evaluation.matchId)) continue;
      seen.add(evaluation.matchId);
      candidates.push({
        matchId: evaluation.matchId,
        offer,
        demand,
        scores: evaluation.scores,
        classification: evaluation.classification,
        status: 'candidate',
        reasons: [
          'Normalized product/service is compatible.',
          `Supply ${offer.country || 'unknown'} → demand ${demand.country || 'unknown'}.`
        ]
      });
    }
  }

  return candidates.sort((a, b) => b.scores.opportunity - a.scores.opportunity || a.matchId.localeCompare(b.matchId));
}
