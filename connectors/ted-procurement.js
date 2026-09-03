/**
 * NEWBASE — TED public-procurement evidence connector.
 *
 * Uses the anonymous TED Search API to find active Spanish procurement
 * notices whose full text matches the product being evaluated. A match is
 * product-level demand evidence; it is never treated as proof of profitability.
 */

const TED_SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search';
const DEFAULT_LOOKBACK_DAYS = 180;

function cleanTerms(productOrService = '') {
  return String(productOrService)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !['other', 'articles', 'goods', 'services'].includes(term))
    .slice(0, 3);
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function extractText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return Object.values(value).flatMap((item) => Array.isArray(item) ? item : [item]).filter((item) => typeof item === 'string').join(' ');
}

function noticeTitle(notice) {
  return extractText(notice?.['notice-title'] ?? notice?.noticeTitle).trim();
}

function noticeUrl(notice) {
  const links = notice?.links;
  if (links && typeof links === 'object') {
    for (const language of Object.values(links)) {
      if (language?.html) return language.html;
      if (language?.xml) return language.xml;
    }
  }
  const publicationNumber = notice?.['publication-number'] ?? notice?.publicationNumber;
  return publicationNumber ? `https://ted.europa.eu/en/notice/-/detail/${publicationNumber}` : TED_SEARCH_URL;
}

/**
 * Search active Spanish TED notices for product-level demand evidence.
 */
export async function searchTedProcurement({
  productOrService,
  targetMarket = 'ES',
  observedAt = new Date().toISOString(),
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  fetchImpl = globalThis.fetch,
  limit = 10,
} = {}) {
  const terms = cleanTerms(productOrService);
  if (!terms.length) return { matches: [], query: null, errors: ['TED_PRODUCT_TERMS_NOT_FOUND'] };

  const country = targetMarket === 'ES' ? 'ESP' : String(targetMarket).toUpperCase();
  const from = formatDate(addDays(new Date(observedAt), -Math.max(1, Number(lookbackDays) || DEFAULT_LOOKBACK_DAYS)));
  const phrase = terms.join(' ');
  const query = `buyer-country=${country} AND publication-date>=${from} AND FT~"${phrase}" SORT BY publication-date DESC`;

  const response = await fetchImpl(TED_SEARCH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      fields: ['publication-number', 'notice-title', 'buyer-name', 'buyer-country', 'publication-date', 'classification-cpv', 'total-value', 'total-value-cur', 'notice-type', 'links'],
      limit: Math.min(100, Math.max(1, Number(limit) || 10)),
      scope: 'ACTIVE',
      paginationMode: 'PAGE_NUMBER',
      page: 1,
      checkQuerySyntax: false,
    }),
  });

  if (!response?.ok) throw new Error(`TED_SEARCH_HTTP_${response?.status ?? 'UNKNOWN'}`);
  const payload = await response.json();
  const raw = Array.isArray(payload?.notices) ? payload.notices : Array.isArray(payload?.results) ? payload.results : [];

  const matches = raw.map((notice) => ({
    publicationNumber: notice?.['publication-number'] ?? notice?.publicationNumber ?? null,
    title: noticeTitle(notice),
    buyer: extractText(notice?.['buyer-name'] ?? notice?.buyerName).trim(),
    country: notice?.['buyer-country'] ?? notice?.buyerCountry ?? country,
    publicationDate: notice?.['publication-date'] ?? notice?.publicationDate ?? null,
    cpv: notice?.['classification-cpv'] ?? notice?.classificationCpv ?? [],
    totalValue: notice?.['total-value'] ?? notice?.totalValue ?? null,
    currency: notice?.['total-value-cur'] ?? notice?.totalValueCur ?? null,
    noticeType: notice?.['notice-type'] ?? notice?.noticeType ?? null,
    url: noticeUrl(notice),
  }));

  return { matches, query, errors: [] };
}

export default { searchTedProcurement };
