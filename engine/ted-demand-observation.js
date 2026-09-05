/**
 * NEWBASE — TED demand observation bridge.
 *
 * Turns public TED procurement notices into observation-only demand evidence
 * and evaluates an existing NEWBASE offer against that evidence. It never
 * publishes, contacts a buyer, places an order, or changes the source record.
 */

import { runConnector } from '../connectors/connector-hub.js';
import { evaluateMatch } from './match-engine-adapter.js';

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export async function observeTedDemand(offer, options = {}) {
  if (!offer || typeof offer !== 'object') {
    return { status: 'blocked', observationOnly: true, reason: 'OFFER_REQUIRED', observations: [] };
  }

  const productOrService = String(offer.productOrService ?? '').trim();
  const country = String(offer.country ?? offer.targetMarket ?? 'ES').trim().toUpperCase();
  if (!productOrService || !country) {
    return { status: 'blocked', observationOnly: true, reason: 'OFFER_FIELDS_REQUIRED', observations: [] };
  }

  const connectorResult = await runConnector('eu-ted-procurement', 'searchTedProcurement', {
    productOrService,
    targetMarket: country,
    observedAt: options.observedAt,
    lookbackDays: options.lookbackDays,
    limit: options.limit ?? 10,
    fetchImpl: options.fetchImpl,
  });

  if (connectorResult.status !== 'success') {
    return {
      status: connectorResult.status,
      observationOnly: true,
      reason: connectorResult.reason ?? 'TED_OBSERVATION_FAILED',
      errors: connectorResult.error ? [connectorResult.error] : [],
      observations: [],
    };
  }

  const matches = Array.isArray(connectorResult.data?.matches) ? connectorResult.data.matches : [];
  const demandStrength = clamp(matches.length * 20);
  const demand = {
    entityId: `ted-demand:${country}:${productOrService.toLowerCase()}`,
    country,
    productOrService: productOrService.toLowerCase(),
    signals: { demand: demandStrength, growth: 0 },
    source: 'eu-ted-procurement',
    evidenceCount: matches.length,
    evidence: matches,
    observationOnly: true,
    participantVerified: false,
  };

  const evaluation = evaluateMatch(offer, demand, {
    demandStrength,
    demandGrowth: 0,
    geographyFit: 100,
    sourceQuality: 90,
    freshness: 90,
    commercialEvidence: matches.length ? 70 : 0,
    hasEvidence: matches.length > 0,
    participantVerified: false,
  });

  return {
    status: 'observed',
    observationOnly: true,
    source: connectorResult.source,
    query: connectorResult.data?.query ?? null,
    demand,
    evaluation,
  };
}

export default { observeTedDemand };
