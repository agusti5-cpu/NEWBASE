/**
 * NEWBASE connector: datos.gob.es national open-data catalogue.
 *
 * Uses the official catalogue API only. It retrieves metadata; it does not
 * assume that every individual dataset permits every downstream use.
 */

const API_BASE = 'https://datos.gob.es/apidata/catalog/dataset.json';

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function buildUrl({ page = 0, pageSize = 20, sort = '-modified' } = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('_page', String(boundedInteger(page, 0, 0, 100000)));
  url.searchParams.set('_pageSize', String(boundedInteger(pageSize, 20, 1, 50)));
  if (sort) url.searchParams.set('_sort', String(sort));
  return url;
}

export async function searchDatasets({
  page = 0,
  pageSize = 20,
  sort = '-modified',
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');

  const response = await fetchImpl(buildUrl({ page, pageSize, sort }), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`DATOS_GOB_ES_API_${response.status}`);

  return response.json();
}

export default { searchDatasets };
