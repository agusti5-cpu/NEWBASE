/**
 * NEWBASE connector: Singapore data.gov.sg
 *
 * Reads public datasets only through the official API.
 * No credentials, scraping, affiliate links or paid service.
 *
 * IMPORTANT: A dataset must still be checked for its own licence/terms
 * before being used commercially.
 */

const API_BASE = "https://api-open.data.gov.sg/v1/public/api/datasets";

export async function listDatasets({ limit = 20, offset = 0 } = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  url.searchParams.set("offset", String(Math.max(offset, 0)));

  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`data.gov.sg API error: ${response.status}`);
  }

  const body = await response.json();
  return {
    source: "data.gov.sg",
    retrievedAt: new Date().toISOString(),
    data: body,
  };
}

export default { listDatasets };
