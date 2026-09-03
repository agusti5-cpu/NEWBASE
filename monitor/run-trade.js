import watchlist from '../config/trade-watchlist.json' with { type: 'json' };
import { getTradeOpportunity } from '../connectors/un-comtrade-trade.js';
import { runNewbase } from '../engine/newbase-pipeline.js';

/**
 * Run targeted international-trade detection through the canonical NEWBASE
 * pipeline. Trade data is evidence of commercial movement, not proof of
 * profitability, retail demand, import eligibility or product compliance.
 *
 * Periods advance automatically: the latest completed calendar year is used
 * as the preferred current period, with the preceding year as comparison.
 * The configured watchlist remains a safe fallback when an API lags.
 */
export async function runTradeDetector({
  routes = watchlist.routes,
  currentPeriod,
  previousPeriod,
  observedAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
  options = {},
} = {}) {
  const year = new Date(observedAt).getUTCFullYear();
  const automaticCurrent = year - 1;
  const automaticPrevious = year - 2;
  const configuredCurrent = Number(watchlist.periods?.current);
  const configuredPrevious = Number(watchlist.periods?.previous);
  const current = currentPeriod ?? (Number.isFinite(configuredCurrent) && configuredCurrent >= automaticCurrent - 1 ? Math.max(configuredCurrent, automaticCurrent) : automaticCurrent);
  const previous = previousPeriod ?? (Number.isFinite(configuredPrevious) && configuredPrevious >= automaticPrevious - 1 ? Math.max(configuredPrevious, automaticPrevious) : automaticPrevious);

  const candidates = [];
  const errors = [];

  for (const route of routes ?? []) {
    for (const product of route.products ?? []) {
      try {
        const candidate = await getTradeOpportunity({
          originReporterCode: route.originReporterCode,
          targetReporterCode: route.targetReporterCode,
          originMarket: route.originMarket,
          targetMarket: route.targetMarket,
          productCode: product.code,
          currentPeriod: current,
          previousPeriod: previous,
          observedAt,
          fetchImpl,
        });

        if (candidate) {
          candidate.productOrService = product.name || candidate.productOrService;
          candidates.push(candidate);
        }
      } catch (error) {
        errors.push({
          route: `${route.originMarket}-${route.targetMarket}`,
          productCode: product.code,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const result = runNewbase(candidates, { observedAt }, options);

  return {
    source: 'un-comtrade-preview',
    status: errors.length === 0 ? 'success' : candidates.length > 0 ? 'partial' : 'unavailable',
    observedAt,
    generatedAt: observedAt,
    periods: { current, previous },
    inputCount: result.inputCount,
    normalizedCount: result.normalizedCount,
    accepted: result.accepted,
    rejected: result.rejected,
    publishable: result.publishable,
    notPublishable: result.notPublishable,
    errors,
  };
}

export default runTradeDetector;

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTradeDetector();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
