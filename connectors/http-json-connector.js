/**
 * NEWBASE — Generic JSON connector
 *
 * Fetches JSON only from an explicitly supplied endpoint. Authentication,
 * scraping and source discovery are intentionally outside this connector.
 */

export const DEFAULT_TIMEOUT_MS = 10000;

function assertHttpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('SOURCE_URL_MUST_USE_HTTPS');
  }
  return url;
}

export async function fetchJsonSource(url, options = {}) {
  const endpoint = assertHttpUrl(url);
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1000, options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SOURCE_HTTP_${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('SOURCE_RESPONSE_NOT_JSON');
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}
