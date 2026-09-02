/**
 * NEWBASE connector: Eurostat public Statistics API.
 *
 * Public REST access; no API key, scraping or paid service is used here.
 * The connector retrieves official statistics only. Dataset-specific reuse
 * conditions and any downstream product regulation remain separate checks.
 */

const API_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

function boundedLastPeriods(value) {
  const number = Number(value);
  if (!Number.isInteger(number)) return 2;
  return Math.min(24, Math.max(1, number));
}

export async function fetchDataset({
  datasetCode,
  lang = 'en',
  lastTimePeriod = 2,
  filters = {},
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');
  if (typeof datasetCode !== 'string' || !datasetCode.trim()) {
    throw new TypeError('DATASET_CODE_REQUIRED');
  }

  const url = new URL(`${API_BASE}/${encodeURIComponent(datasetCode.trim())}`);
  url.searchParams.set('lang', String(lang));
  url.searchParams.set('lastTimePeriod', String(boundedLastPeriods(lastTimePeriod)));

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`EUROSTAT_API_${response.status}`);
  return response.json();
}

export default { fetchDataset };
