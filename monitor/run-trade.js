import watchlist from '../config/trade-watchlist.json' with { type: 'json' };
import { getTradeOpportunity } from '../connectors/un-comtrade-trade.js';
import { runNewbase } from '../engine/newbase-pipeline.js';

/**
 * Run targeted international-trade detection through the canonical NEWBASE
 * pipeline. Trade data is evidence of commercial movement, not proof of
 * profitability, retail demand, import eligibility or product compliance.
 */
export async function runTradeDetector({
  routes = watchlist.routes,
  currentPeriod = watchlist.periods.current,
  previousPeriod = watchlist.periods.previous,
  observedAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
  options = {},
} = {}) {
  const candidates = [];

  for (const route of routes ?? []) {
    for (const product of route.products ?? []) {
      const candidate = await getTradeOpportunity({
        originReporterCode: route.originReporterCode,
        targetReporterCode: route.targetReporterCode,
        originMarket: route.originMarket,
        targetMarket: route.targetMarket,
        productCode: product.code,
        currentPeriod,
        previousPeriod,
        observedAt,
        fetchImpl,
      });

      if (candidate) {
        candidate.productOrService = product.name || candidate.productOrService;
        candidates.push(candidate);
      }
    }
  }

  const result = runNewbase(candidates, { observedAt }, options);

  return {
    source: 'un-comtrade-preview',
    observedAt,
    periods: { current: currentPeriod, previous: previousPeriod },
    inputCount: result.inputCount,
    normalizedCount: result.normalizedCount,
    accepted: result.accepted,
    rejected: result.rejected,
  };
}

export default runTradeDetector;

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTradeDetector();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
