export function normalizeOpportunity(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Opportunity must be an object');
  }

  return {
    id: String(input.id ?? crypto.randomUUID()),
    title: String(input.title ?? '').trim(),
    source: String(input.source ?? '').trim(),
    market: String(input.market ?? 'WORLD').toUpperCase(),
    language: String(input.language ?? 'en').toLowerCase(),
    url: String(input.url ?? '').trim(),
    category: String(input.category ?? 'other').trim().toLowerCase(),
    currency: input.currency ? String(input.currency).toUpperCase() : null,
    price: toNumberOrNull(input.price),
    detectedAt: input.detectedAt ?? new Date().toISOString(),
    legal: Boolean(input.legal),
    authorizedAccess: Boolean(input.authorizedAccess),
    score: 0
  };
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
