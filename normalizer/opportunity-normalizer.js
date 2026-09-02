/**
 * NEWBASE — Opportunity Normalizer
 * Converts connector records into the canonical opportunity shape.
 */

function text(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSignals(raw = {}) {
  return {
    demand: number(raw.demand),
    growth: number(raw.growth),
    marketGap: number(raw.marketGap),
    availability: number(raw.availability),
  };
}

function normalizeOpportunity(raw, context = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('OPPORTUNITY_MUST_BE_OBJECT');
  }

  const source = raw.source || context.source || {};
  const legal = raw.legal || context.legal || { status: 'unknown' };

  return {
    id: text(raw.id || raw.identifier),
    category: text(raw.category || context.category),
    productOrService: text(raw.productOrService || raw.name || raw.title),
    originMarket: text(raw.originMarket || context.originMarket),
    targetMarket: text(raw.targetMarket || context.targetMarket),
    source: {
      name: text(source.name || context.sourceName),
      type: text(source.type || context.sourceType),
      url: text(source.url),
    },
    observedAt: text(raw.observedAt || context.observedAt || new Date().toISOString()),
    originalData: raw.originalData ?? raw,
    signals: normalizeSignals(raw.signals),
    confidence: number(raw.confidence),
    legal: {
      status: text(legal.status, 'unknown'),
      reason: text(legal.reason),
      checkedAt: text(legal.checkedAt),
    },
    commercial: {
      price: number(raw.commercial?.price, null),
      currency: text(raw.commercial?.currency),
      knownCosts: number(raw.commercial?.knownCosts, null),
    },
  };
}

function normalizeBatch(records, context = {}) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => normalizeOpportunity(record, context));
}

export { normalizeOpportunity, normalizeBatch };
