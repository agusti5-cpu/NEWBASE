/**
 * NEWBASE — automatic commercial-context enrichment.
 *
 * This module gathers independent official-market context without claiming that
 * macro indicators prove product-level profitability. Product-level commercial
 * evidence remains a separate publication requirement and the gate stays closed
 * unless that evidence exists.
 */

import { fetchRetailIndex } from '../connectors/ine-retail-index.js';
import { fetchDataset } from '../connectors/eurostat.js';

const INE_URL = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/75808';
const EUROSTAT_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx';

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

function evidence(type, sourceName, sourceUrl, observedAt, summary) {
  return { type, sourceName, sourceUrl, observedAt, summary };
}

/**
 * Collect target-market context for a trade opportunity.
 * Failures are returned as diagnostics and never become fabricated evidence.
 */
export async function collectCommercialContext({ targetMarket = 'ES', observedAt = new Date().toISOString(), fetchImpl = globalThis.fetch } = {}) {
  const evidence = [];
  const errors = [];

  if (targetMarket === 'ES') {
    try {
      const payload = await fetchRetailIndex({ nult: 2, fetchImpl });
      const latest = pickLatestIne(payload);
      if (latest) {
        evidence.push(evidenceItem('demand_context', 'Instituto Nacional de Estadística (INE)', INE_URL, observedAt, `Official Spanish retail-index context: ${latest.name}; latest observed value ${latest.latest.value}. This is target-market context, not product-level demand proof.`));
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
      evidence.push(evidenceItem('economics_context', 'Eurostat', EUROSTAT_URL, observedAt, `Official Eurostat HICP context for ${targetMarket}; latest returned index value ${latest.value}. This is macroeconomic context, not product-level cost or profitability proof.`));
    } else {
      errors.push('EUROSTAT_ECONOMIC_CONTEXT_NOT_FOUND');
    }
  } catch (error) {
    errors.push(`EUROSTAT_CONTEXT_${error instanceof Error ? error.message : String(error)}`);
  }

  return { targetMarket, evidence, errors };
}

function evidenceItem(type, sourceName, sourceUrl, observedAt, summary) {
  return evidence(type, sourceName, sourceUrl, observedAt, summary);
}

export async function enrichTradeOpportunities(opportunities = [], options = {}) {
  const output = [];
  const diagnostics = [];

  for (const opportunity of Array.isArray(opportunities) ? opportunities : []) {
    const context = await collectCommercialContext({
      targetMarket: opportunity.targetMarket,
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
