import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDemand, normalizeDemandBatch } from './demand-normalizer.js';

test('normalizes an observed opportunity into a demand entity without claiming a buyer', () => {
  const result = normalizeDemand({
    opportunityId: 'comtrade-IN-ES-630790-2025',
    targetMarket: 'es',
    productOrService: 'Other made-up textile articles',
    signals: { demand: 83, growth: 100 }
  });

  assert.deepEqual(result, {
    entityId: 'demand:comtrade-IN-ES-630790-2025',
    country: 'ES',
    productOrService: 'other made-up textile articles',
    signals: { demand: 83, growth: 100 },
    source: 'newbase-observed-demand',
    observationOnly: true
  });
});

test('rejects incomplete records and normalizes batches deterministically', () => {
  const result = normalizeDemandBatch([
    { id: 'a', targetMarket: 'fr', productOrService: 'x', signals: { demand: 120, growth: -5 } },
    { id: 'incomplete', targetMarket: 'fr' },
    { id: 'b', targetMarket: 'de', productOrService: 'Y', signals: { demand: 50, growth: 40 } }
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0].signals, { demand: 100, growth: 0 });
  assert.equal(result[1].productOrService, 'y');
  assert.equal(result[1].observationOnly, true);
});
