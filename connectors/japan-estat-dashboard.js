/**
 * NEWBASE connector: Japan Statistics Dashboard (e-Stat).
 *
 * Official Japanese government statistics API. The dashboard API is public,
 * machine-readable and requires no registration. NEWBASE uses it only through
 * the documented API; no scraping, credentials, subscription or affiliate
 * service is involved.
 *
 * Published services using this API must display the official credit required
 * by the Statistics Bureau; the application layer owns that presentation.
 */

const API_BASE = 'https://dashboard.e-stat.go.jp/api/1.0/Json';

function addParams(url, params = {}) {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function request(path, params, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');
  const url = addParams(new URL(`${API_BASE}/${path}`), params);
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`JAPAN_ESTAT_API_${response.status}`);
  return response.json();
}

export async function fetchData({ indicator, region, time, fetchImpl, ...params } = {}) {
  if (typeof indicator !== 'string' || !indicator.trim()) {
    throw new TypeError('INDICATOR_REQUIRED');
  }
  return request('getData', { indicator, region, time, ...params }, fetchImpl);
}

export async function fetchIndicatorInfo({ category, surveyName, fetchImpl, ...params } = {}) {
  return request('getIndicatorInfo', { category, surveyName, ...params }, fetchImpl);
}

export async function fetchRegionInfo({ region, fetchImpl, ...params } = {}) {
  return request('getRegionInfo', { region, ...params }, fetchImpl);
}

export default { fetchData, fetchIndicatorInfo, fetchRegionInfo };
