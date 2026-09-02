/**
 * NEWBASE connector: data.gov.sg top search pages.
 * Official API only. No scraping, credentials, paid service or affiliate flow.
 * Dataset: d_78853d8f18e64df6836077d33d44375a
 * Commercial-use licence is stated on the official dataset page; terms must
 * still be respected for every downstream use.
 */

const DATASET_ID = "d_78853d8f18e64df6836077d33d44375a";
const API_BASE = "https://data.gov.sg/api/action/datastore_search";

export async function getTopSearchPages({ limit = 100 } = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource_id", DATASET_ID);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 1000)));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`data.gov.sg search API error: ${response.status}`);

  const body = await response.json();
  const records = body?.result?.records ?? [];

  return {
    source: "data.gov.sg",
    datasetId: DATASET_ID,
    retrievedAt: new Date().toISOString(),
    records,
  };
}

export function calculateSearchSignal(record) {
  const impressions = Number(record?.Impressions ?? 0);
  const clicks = Number(record?.Clicks ?? 0);
  const ctr = Number(record?.Click_through_rate ?? 0);

  return {
    page: String(record?.Page ?? ""),
    quarter: String(record?.quarter ?? ""),
    impressions: Number.isFinite(impressions) ? impressions : 0,
    clicks: Number.isFinite(clicks) ? clicks : 0,
    ctr: Number.isFinite(ctr) ? ctr : 0,
    signal: clicks > 0 || impressions > 0,
  };
}

export default { getTopSearchPages, calculateSearchSignal };
