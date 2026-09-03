import watchlist from '../config/trade-watchlist.json' with { type: 'json' };
import { getTradeOpportunity } from '../connectors/un-comtrade-trade.js';
import { enrichTradeOpportunities } from '../engine/commercial-evidence-enricher.js';
import { runNewbase } from '../engine/newbase-pipeline.js';

export async function runTradeDetector({ routes = watchlist.routes, currentPeriod, previousPeriod, observedAt = new Date().toISOString(), fetchImpl = globalThis.fetch, options = {} } = {}) {
  const year = new Date(observedAt).getUTCFullYear();
  const automaticCurrent = year - 1;
  const automaticPrevious = year - 2;
  const configuredCurrent = Number(watchlist.periods?.current);
  const configuredPrevious = Number(watchlist.periods?.previous);
  const current = currentPeriod ?? (Number.isFinite(configuredCurrent) && configuredCurrent >= automaticCurrent - 1 ? Math.max(configuredCurrent, automaticCurrent) : automaticCurrent);
  const previous = previousPeriod ?? (Number.isFinite(configuredPrevious) && configuredPrevious >= automaticPrevious - 1 ? Math.max(configuredPrevious, automaticPrevious) : automaticPrevious);
  const candidates = [];
  const errors = [];
  const provenance = [];

  for (const route of routes ?? []) {
    for (const product of route.products ?? []) {
      try {
        const result = await getTradeOpportunity({ originReporterCode: route.originReporterCode, targetReporterCode: route.targetReporterCode, originMarket: route.originMarket, targetMarket: route.targetMarket, productCode: product.code, currentPeriod: current, previousPeriod: previous, observedAt, fetchImpl });
        if (result?.opportunity) {
          result.opportunity.productOrService = product.name || result.opportunity.productOrService;
          candidates.push(result.opportunity);
          provenance.push({ opportunityId: result.opportunity.id, requestedPeriods: { current, previous }, usedPeriods: result.periods, fallback: result.fallback });
        }
      } catch (error) {
        errors.push({ route: `${route.originMarket}-${route.targetMarket}`, productCode: product.code, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const enrichment = await enrichTradeOpportunities(candidates, { observedAt, fetchImpl });
  const result = runNewbase(enrichment.opportunities, { observedAt }, options);

  return {
    source: 'un-comtrade-preview',
    status: errors.length === 0 ? 'success' : result.inputCount > 0 ? 'partial' : 'unavailable',
    observedAt,
    generatedAt: observedAt,
    periods: { current, previous },
    inputCount: result.inputCount,
    normalizedCount: result.normalizedCount,
    accepted: result.accepted,
    rejected: result.rejected,
    publishable: result.publishable,
    notPublishable: result.notPublishable,
    commercialEnrichment: enrichment.diagnostics,
    provenance,
    errors,
  };
}

export default runTradeDetector;

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTradeDetector();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
