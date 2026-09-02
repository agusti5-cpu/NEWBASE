import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchData, fetchIndicatorInfo, fetchRegionInfo } from '../connectors/japan-estat-dashboard.js';

test('Japan e-Stat dashboard connector builds documented JSON data requests', async () => {
  let requestedUrl;
  const payload = { data: [{ value: 123 }] };

  const result = await fetchData({
    indicator: '0301010001010010010',
    region: '00000',
    time: '2026CY00',
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => payload };
    },
  });

  assert.deepEqual(result, payload);
  assert.equal(requestedUrl.origin, 'https://dashboard.e-stat.go.jp');
  assert.equal(requestedUrl.pathname, '/api/1.0/Json/getData');
  assert.equal(requestedUrl.searchParams.get('Lang'), 'EN');
  assert.equal(requestedUrl.searchParams.get('IndicatorCode'), '0301010001010010010');
  assert.equal(requestedUrl.searchParams.get('RegionCode'), '00000');
  assert.equal(requestedUrl.searchParams.get('Time'), '2026CY00');
});

test('Japan e-Stat connector exposes indicator and region metadata endpoints', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(new URL(url));
    return { ok: true, json: async () => ({ ok: true }) };
  };

  await fetchIndicatorInfo({ indicatorCode: '0301010001010010010', fetchImpl });
  await fetchRegionInfo({ regionCode: '00000', fetchImpl });

  assert.equal(urls[0].pathname, '/api/1.0/Json/getIndicatorInfo');
  assert.equal(urls[0].searchParams.get('IndicatorCode'), '0301010001010010010');
  assert.equal(urls[1].pathname, '/api/1.0/Json/getRegionInfo');
  assert.equal(urls[1].searchParams.get('RegionCode'), '00000');
});

test('Japan e-Stat connector rejects missing indicators', async () => {
  await assert.rejects(
    () => fetchData({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }),
    /INDICATOR_REQUIRED/
  );
});
