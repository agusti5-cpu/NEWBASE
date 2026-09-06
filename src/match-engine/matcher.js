import { calculateScores, classify, stableMatchId } from './scoring.js';

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
      const scores = calculateScores({
        productFit: options.productFit ?? offer?.signals?.productFit ?? offer?.signals?.marketGap ?? 0,
        demandStrength: options.demandStrength ?? demand?.signals?.demand ?? 0,
        supplyStrength: options.supplyStrength ?? offer?.signals?.availability ?? 0,
        demandGrowth: options.demandGrowth ?? demand?.signals?.growth ?? 0,
        geographyFit,
        commercialEvidence: options.commercialEvidence ?? offer?.signals?.commercialEvidence ?? 0,
        freshness: options.freshness ?? offer?.signals?.freshness ?? 0,
        sourceQuality: options.sourceQuality ?? offer?.signals?.sourceQuality ?? 0,
        viability: options.viability ?? offer?.viability ?? 0,
        risk: options.risk ?? offer?.risk ?? 100
      });
      const classification = classify(scores, {
        hasEvidence: options.hasEvidence ?? Boolean(rawOffer && rawDemand),
        participantVerified: options.participantVerified ?? false
      });
      const matchId = stableMatchId(offer, demand);

      if (seen.has(matchId)) continue;
      seen.add(matchId);
      candidates.push({
        matchId,
        offer,
        demand,
        scores,
        classification,
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
