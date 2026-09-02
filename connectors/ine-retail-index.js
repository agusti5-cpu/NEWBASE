/**
 * NEWBASE connector: INE Retail Trade Indices (table 75808).
 *
 * Official INE JSON API only. No credentials, scraping, affiliate flow or
 * paid service. The connector converts the latest observations into
 * opportunity candidates without inventing supply, price or legal facts.
 *
 * Source: https://www.ine.es/jaxiT3/Tabla.htm?t=75808
 */

const API_BASE = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/75808';

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function seriesName(series) {
  return String(series?.Nombre || series?.NombreSerie || series?.name || '').trim();
}

function observations(series) {
  const data = series?.Data ?? series?.data ?? [];
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => ({
      date: item?.Fecha ?? item?.date ?? null,
      value: numeric(item?.Valor ?? item?.value),
    }))
    .filter((item) => item.value !== null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function isIndexSeries(series) {
  const name = seriesName(series).toLowerCase();
  return name.includes('índice') && !name.includes('variación') && !name.includes('variation');
}

function growthSignal(previous, latest) {
  if (previous === null || latest === null || previous === 0) return 0;
  const pct = ((latest - previous) / Math.abs(previous)) * 100;
  return clamp(50 + pct * 5);
}

/**
 * Fetch the latest INE observations for table 75808.
 * `nult` controls how many recent observations are requested from INE.
 */
export async function fetchRetailIndex({ nult = 2, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');

  const url = new URL(API_BASE);
  url.searchParams.set('nult', String(Math.min(Math.max(Number(nult) || 2, 2), 24)));
  url.searchParams.set('tip', 'AM');

  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`INE_API_${response.status}`);

  return response.json();
}

/**
 * Turn the INE response into canonical NEWBASE candidates.
 * Only observed demand/growth are scored; supply, price and market gap stay
 * explicitly unknown (0) until a source provides evidence for them.
 */
export function toOpportunityCandidates(payload, { observedAt = new Date().toISOString() } = {}) {
  const series = Array.isArray(payload) ? payload : [];

  return series
    .filter(isIndexSeries)
    .map((item, index) => {
      const name = seriesName(item) || `INE retail series ${index + 1}`;
      const data = observations(item);
      const latest = data.at(-1);
      const previous = data.at(-2);
      const latestValue = latest?.value ?? 0;
      const demand = clamp(latestValue / 2);
      const growth = growthSignal(previous?.value ?? null, latest?.value ?? null);

      return {
        id: `ine-75808-${index}-${String(latest?.date ?? 'latest')}`,
        category: 'comercio',
        productOrService: name,
        originMarket: 'ES',
        targetMarket: 'ES',
        source: {
          name: 'Instituto Nacional de Estadística (INE)',
          type: 'api',
          url: API_BASE,
        },
        observedAt,
        originalData: item,
        signals: {
          demand,
          growth,
          marketGap: 0,
          availability: 0,
        },
        confidence: latest ? 0.9 : 0.5,
        legal: {
          status: 'allowed',
          reason: 'Official INE public API; downstream use remains subject to INE legal notice.',
          checkedAt: observedAt,
        },
        commercial: {
          price: null,
          currency: '',
          knownCosts: null,
        },
      };
    });
}

export async function getRetailOpportunityCandidates(options = {}) {
  const payload = await fetchRetailIndex(options);
  return toOpportunityCandidates(payload, options);
}

export default {
  fetchRetailIndex,
  toOpportunityCandidates,
  getRetailOpportunityCandidates,
};
