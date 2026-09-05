import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMatchEvaluation, evaluateMatch } from './match-engine-adapter.js';

test('adapter is opt-in and returns deterministic match metadata', () => {
  const offer = {
    entityId: 'supplier-1',
    country: 'ES',
    productOrService: 'solar-panels',
    signals: { marketGap: 90, availability: 90, commercialEvidence: 90, freshness: 90, sourceQuality: 90 },
    viability: 90,
    risk: 10
  };
  const demand = {
    entityId: 'buyer-1',
    country: 'FR',
    productOrService: 'solar-panels',
    signals: { demand: 90, growth: 90 }
  };

  const result = evaluateMatch(offer, demand, { participantVerified: true, geographyFit: 80 });

  assert.equal(result.matchId, 'supplier-1|es|solar-panels|buyer-1|fr|solar-panels');
  assert.equal(result.scores.match, 89);
  assert.equal(result.scores.confidence, 90);
  assert.equal(result.classification, 'exceptional');
});

test('adapter can attach without replacing the original opportunity fields', () => {
  const opportunity = { id: 'opp-1', status: 'candidate', score: 72 };
  const offer = { entityId: 'offer-1', country: 'ES', productOrService: 'x' };
  const demand = { entityId: 'demand-1', country: 'FR', productOrService: 'x' };

  const result = attachMatchEvaluation(opportunity, offer, demand);

  assert.equal(result.id, 'opp-1');
  assert.equal(result.status, 'candidate');
  assert.equal(result.score, 72);
  assert.ok(result.matchEvaluation);
});
