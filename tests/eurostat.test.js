import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDataset } from '../connectors/eurostat.js';

test('Eurostat connector builds a bounded public API request', async () => {
  let requestedUrl;
  const payload = { id: ['geo'], size: [1], value: [1] };

  const result = await fetchDataset({
    datasetCode: 'demo',
    lang: 'en',
    lastTimePeriod: 100,
    filters: { geo: 'ES' },
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => payload };
    },
  });

  assert.deepEqual(result, payload);
  assert.equal(requestedUrl.origin, 'https://ec.europa.eu');
  assert.equal(requestedUrl.pathname, '/eurostat/api/dissemination/statistics/1.0/data/demo');
  assert.equal(requestedUrl.searchParams.get('lang'), 'en');
  assert.equal(requestedUrl.searchParams.get('lastTimePeriod'), '24');
  assert.equal(requestedUrl.searchParams.get('geo'), 'ES');
});

test('Eurostat connector rejects missing dataset codes', async () => {
  await assert.rejects(
    () => fetchDataset({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }),
    /DATASET_CODE_REQUIRED/
  );
});
