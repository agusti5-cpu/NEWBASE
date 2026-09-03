/**
 * NEWBASE — automatic commercial-context enrichment.
 *
 * Macro indicators are context only. Product-level publication requires
 * corroboration from a concrete procurement signal (TED) plus a product-level
 * market-economics signal already present in the trade evidence (UN Comtrade).
 */

import { fetchRetailIndex } from '../connectors/ine-retail-index.js';
import { fetchDataset } from '../connectors/eurostat.js';
import { searchTedProcurement } from '../connectors/ted-procurement.js';

const INE_URL = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/75808';
const EUROSTAT_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx';
const TED_URL = 'https://api.ted.europa.eu/v3/notices/search';

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickLatestIne(payload) {
  const series = Array.isArray(payload) ? payload : [];
  const candidates = series
    .filter((item) => String(item?.Nombre || item?.NombreSerie || '').toLowerCase().includes('índice'))
    .map((item) => {
      const data = Array.isArray(item?.Data ?? item?.data) ? (item.Data ?? item.data) : [];
      const observations = data
        .map((row) => ({ date: row?.Fecha ?? row?.date, value: numeric(row?.Valor ?? row?.value) }))
        .filter((row) => row.value !== null)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      return { name: String(item?.Nombre || item?.NombreSerie || 'INE retail index').trim(), latest: observations.at(-1) };
    })
    .filter((item) => item.latest);

  return candidates.find((item) => item.name.toLowerCase().includes('españa')) ?? candidates[0] ?? null;
}

function pickLatestEurostat(payload) {
  const values = payload?.value;
  if (!values || typeof values !== 'object') return null;
  const entries = Object.entries(values)
    .map(([key, value]) => ({ key, value: numeric(value) }))
    .filter((item) => item.value !== null);
  return entries.at(-1) ?? null;
}

function evidence(type, sourceName, sourceUrl, observedAt, summary, evidenceLevel = 'context') {
  return { type, sourceName, sourceUrl, observedAt, summary, evidenceLevel };
}

/**
 * Collect independent target-market context and product-level procurement
 * evidence. Failures are diagnostics and never become fabricated evidence.
 */
export async function collectCommercialContext({ targetMarket = 'ES', productOrService = '', tradeEvidence = null, observedAt = new Date().toISOString(), fetchImpl = globalThis.fetch } = {}) {
  const contextEvidence = [];
  const productEvidence = [];
  const errors = [];

  if (targetMarket === 'ES') {
    try {
      const payload = await fetchRetailIndex({ nult: 2, fetchImpl });
      const latest = pickLatestIne(payload);
      if (latest) {
        contextEvidence.push(evidence('demand_context', 'Instituto Nacional de Estadística (INE)', INE_URL, observedAt, `Official Spanish retail-index context: ${latest.name}; latest observed value ${latest.latest.value}. This is target-market context, not product-level demand proof.`));
      } else {
        errors.push('INE_RETAIL_CONTEXT_NOT_FOUND');
      }
    } catch (error) {
      errors.push(`INE_CONTEXT_${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const payload = await fetchDataset({
      datasetCode: 'prc_hicp_midx',
      lang: 'en',
      lastTimePeriod: 2,
      filters: { geo: targetMarket, coicop: 'CP00', unit: 'I15' },
      fetchImpl,
    });
    const latest = pickLatestEurostat(payload);
    if (latest) {
      contextEvidence.push(evidence('economics_context', 'Eurostat', EUROSTAT_URL, observedAt, `Official Eurostat HICP context for ${targetMarket}; latest returned index value ${latest.value}. This is macroeconomic context, not product-level cost or profitability proof.`));
    } else {
      errors.push('EUROSTAT_ECONOMIC_CONTEXT_NOT_FOUND');
    }
  } catch (error) {
    errors.push(`EUROSTAT_CONTEXT_${error instanceof Error ? error.message : String(error)}`);
  }

  // TED is a product-level demand source. Do not query it when there is no
  // product to search for; this keeps generic context calls deterministic.
  if (String(productOrService).trim()) {
    try {
      const ted = await searchTedProcurement({ productOrService, targetMarket, observedAt, fetchImpl });
      if (ted.matches.length) {
        const match = ted.matches[0];
        productEvidence.push(evidence(
          'demand',
          'Tenders Electronic Daily (TED)',
          match.url || TED_URL,
          observedAt,
          `Active EU public-procurement notice matched to the evaluated product: ${match.title || productOrService}. Publication ${match.publicationNumber || 'unknown'}; buyer ${match.buyer || 'unknown'}; published ${match.publicationDate || 'unknown'}. This is procurement demand evidence, not guaranteed private-market demand or profitability.`,
          'product',
        ));
      } else {
        errors.push('TED_PRODUCT_DEMAND_NOT_FOUND');
      }
    } catch (error) {
      errors.push(`TED_CONTEXT_${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (tradeEvidence?.sourceName === 'United Nations UN Comtrade' && tradeEvidence?.sourceUrl) {
    productEvidence.push(evidence(
      'economics',
      tradeEvidence.sourceName,
      tradeEvidence.sourceUrl,
      tradeEvidence.observedAt || observedAt,
      `Product-level UN Comtrade trade-flow evidence for ${productOrService}: the evaluated origin/target route has observed import/export value and quantity data for the selected periods. This is market-economics evidence, not a profitability guarantee.`,
      'product',
    ));
  }

  return {
    targetMarket,
    // Keep the original aggregate field for compatibility with existing callers/tests.
    evidence: [...contextEvidence, ...productEvidence],
    contextEvidence,
    productEvidence,
    errors,
  };
}

export async function enrichTradeOpportunities(opportunities = [], options = {}) {
  const output = [];
  const diagnostics = [];

  for (const opportunity of Array.isArray(opportunities) ? opportunities : []) {
    const context = await collectCommercialContext({
      targetMarket: opportunity.targetMarket,
      productOrService: opportunity.productOrService,
      tradeEvidence: opportunity.evidence,
      observedAt: options.observedAt ?? opportunity.observedAt,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
    });

    const existing = opportunity.commercialValidation?.evidence;
    const evidenceList = Array.isArray(existing) ? existing : [];

    output.push({
      ...opportunity,
      commercialValidation: {
        evidence: [...evidenceList, ...context.evidence],
      },
    });

    diagnostics.push({ opportunityId: opportunity.id, ...context });
  }

  return { opportunities: output, diagnostics };
}

export default { collectCommercialContext, enrichTradeOpportunities };
