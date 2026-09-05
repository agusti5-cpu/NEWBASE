const clamp = (value) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

/**
 * Convert an existing NEWBASE opportunity/evidence record into a deterministic
 * demand-side entity for observation. This does not assert a real buyer;
 * it represents observed target-market demand signals only.
 */
export function normalizeDemand(opportunity) {
  const id = String(opportunity?.opportunityId ?? opportunity?.id ?? '').trim();
  const country = String(opportunity?.targetMarket ?? opportunity?.opportunity?.targetMarket ?? '').trim().toUpperCase();
  const productOrService = String(opportunity?.productOrService ?? opportunity?.opportunity?.productOrService ?? '').trim();
  const signals = opportunity?.signals ?? opportunity?.opportunity?.signals ?? {};

  if (!id || !country || !productOrService) return null;

  return {
    entityId: `demand:${id}`,
    country,
    productOrService: normalizeText(productOrService),
    signals: {
      demand: clamp(signals.demand),
      growth: clamp(signals.growth)
    },
    source: 'newbase-observed-demand',
    observationOnly: true
  };
}

export function normalizeDemandBatch(opportunities) {
  return (Array.isArray(opportunities) ? opportunities : [])
    .map(normalizeDemand)
    .filter(Boolean);
}
