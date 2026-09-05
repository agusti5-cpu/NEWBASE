import { observeTedDemand } from '../engine/ted-demand-observation.js';

const productOrService = process.env.TED_OBSERVATION_PRODUCT || 'mobiliario de oficina';
const country = process.env.TED_OBSERVATION_COUNTRY || 'ES';

const result = await observeTedDemand(
  {
    entityId: 'ted-live-smoke-offer',
    country,
    productOrService,
    signals: { productFit: 50, availability: 50 },
    viability: 50,
    risk: 50,
  },
  { lookbackDays: 180, limit: 10 }
);

if (result.status !== 'observed') {
  throw new Error(`TED observation failed: ${result.reason || result.status}`);
}
if (result.observationOnly !== true) {
  throw new Error('TED observation is not observation-only');
}
if (result.demand?.participantVerified !== false) {
  throw new Error('TED observation must never verify a commercial participant');
}
if (!Number.isInteger(result.demand?.evidenceCount) || result.demand.evidenceCount < 1) {
  throw new Error('TED live observation returned no matching procurement evidence');
}

const summary = {
  status: result.status,
  observationOnly: result.observationOnly,
  source: result.demand.source,
  country: result.demand.country,
  productOrService: result.demand.productOrService,
  evidenceCount: result.demand.evidenceCount,
  classification: result.evaluation.classification,
  evidence: result.demand.evidence.map(({ publicationNumber, title, buyer, publicationDate, url }) => ({
    publicationNumber,
    title,
    buyer,
    publicationDate,
    url,
  })),
  query: result.query,
};

console.log(JSON.stringify(summary, null, 2));
