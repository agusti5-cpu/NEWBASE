import test from 'node:test';
import assert from 'node:assert/strict';
import { searchDatasets } from '../connectors/datos-gob-es.js';

test('datos.gob.es connector uses the official API and bounded pagination', async () => {
  let requestedUrl;
  const payload = { result: { bindings: [] } };

  const response = await searchDatasets({
    page: -4,
    pageSize: 500,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => payload };
    },
  });

  assert.deepEqual(response, payload);
  assert.equal(requestedUrl.origin, 'https://datos.gob.es');
  assert.equal(requestedUrl.pathname, '/apidata/catalog/dataset.json');
  assert.equal(requestedUrl.searchParams.get('_page'), '0');
  assert.equal(requestedUrl.searchParams.get('_pageSize'), '50');
  assert.equal(requestedUrl.searchParams.get('_sort'), '-modified');
});

test('datos.gob.es connector surfaces API failures', async () => {
  await assert.rejects(
    () => searchDatasets({ fetchImpl: async () => ({ ok: false, status: 503 }) }),
    /DATOS_GOB_ES_API_503/
  );
});
