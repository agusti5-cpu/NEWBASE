import test from 'node:test';
import assert from 'node:assert/strict';
import { observeTedDemand } from '../engine/ted-demand-observation.js';

function tedFetch() {
  return async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        notices: [
          {
            'publication-number': 'TED-TEST-001',
            'notice-title': { eng: 'Supply of electric charging equipment' },
            'buyer-name': { eng: 'Example Public Buyer' },
            'buyer-country': 'ESP',
            'publication-date': '2026-09-05',
            'classification-cpv': ['31681500'],
            links: { eng: { html: 'https://ted.europa.eu/en/notice/-/detail/TED-TEST-001' } }
          }
        ]
      };
    }
  });
}

test('TED evidence becomes observation-only demand and a candidate match', async () => {
  const result = await observeTedDemand({
    entityId: 'offer-1',
    country: 'ES',
    productOrService: 'electric charging equipment',
    signals: { productFit: 90, availability: 80 },
    viability: 80,
    risk: 20
  }, { fetchImpl: tedFetch(), observedAt: '2026-09-05T12:00:00.000Z' });

  assert.equal(result.status, 'observed');
  assert.equal(result.observationOnly, true);
  assert.equal(result.demand.source, 'eu-ted-procurement');
  assert.equal(result.demand.evidenceCount, 1);
  assert.equal(result.demand.participantVerified, false);
  assert.equal(result.evaluation.classification, 'candidate');
});

test('TED observation never becomes a verified commercial participant', async () => {
  const result = await observeTedDemand({
    entityId: 'offer-2',
    country: 'ES',
    productOrService: 'industrial pumps'
  }, { fetchImpl: tedFetch() });

  assert.equal(result.observationOnly, true);
  assert.equal(result.demand.participantVerified, false);
  assert.notEqual(result.evaluation.classification, 'priority');
  assert.notEqual(result.evaluation.classification, 'exceptional');
});
