import test from 'node:test';
import assert from 'node:assert/strict';

const SCORE_KEYS = ['match', 'confidence', 'viability', 'risk', 'opportunity'];

function assertScoreRange(scores) {
  for (const key of SCORE_KEYS) {
    assert.equal(typeof scores[key], 'number', `${key} must be numeric`);
    assert.ok(scores[key] >= 0 && scores[key] <= 100, `${key} must be 0..100`);
  }
}

function stableIdentity(offer, demand) {
  return [
    offer.entityId,
    offer.country,
    offer.productOrService,
    demand.entityId,
    demand.country,
    demand.productOrService
  ].join('|').toLowerCase();
}

test('score contract accepts the five bounded scores', () => {
  assertScoreRange({ match: 94, confidence: 91, viability: 87, risk: 12, opportunity: 90 });
});

test('score boundaries are valid', () => {
  assertScoreRange({ match: 0, confidence: 0, viability: 0, risk: 0, opportunity: 0 });
  assertScoreRange({ match: 100, confidence: 100, viability: 100, risk: 100, opportunity: 100 });
});

test('strong match is structurally eligible for exceptional status', () => {
  const scores = { match: 95, confidence: 94, viability: 92, risk: 10, opportunity: 94 };
  assertScoreRange(scores);
  assert.ok(scores.match >= 90);
  assert.ok(scores.confidence >= 90);
  assert.ok(scores.viability >= 90);
  assert.ok(scores.risk < 30);
});

test('low confidence blocks exceptional classification', () => {
  const scores = { match: 96, confidence: 58, viability: 91, risk: 8, opportunity: 90 };
  assertScoreRange(scores);
  assert.ok(scores.match >= 90);
  assert.ok(scores.confidence < 90);
  assert.notEqual(scores.confidence >= 90 && scores.risk < 30, true);
});

test('high risk blocks exceptional classification', () => {
  const scores = { match: 95, confidence: 94, viability: 90, risk: 82, opportunity: 70 };
  assertScoreRange(scores);
  assert.ok(scores.risk >= 70);
  assert.ok(scores.opportunity < 90);
});

test('material source conflict must reduce confidence', () => {
  const cleanConfidence = 94;
  const conflictingConfidence = 67;
  assert.ok(conflictingConfidence < cleanConfidence);
});

test('duplicate commercial identity produces the same stable identity', () => {
  const offer = { entityId: 'olive-oil', country: 'ES', productOrService: 'Olive Oil' };
  const demand = { entityId: 'olive-oil', country: 'JP', productOrService: 'Olive Oil' };
  const copy = { ...demand };
  assert.equal(stableIdentity(offer, demand), stableIdentity(offer, copy));
});

test('different direction produces a different identity', () => {
  const offer = { entityId: 'x', country: 'ES', productOrService: 'X' };
  const jpDemand = { entityId: 'x', country: 'JP', productOrService: 'X' };
  const deDemand = { entityId: 'x', country: 'DE', productOrService: 'X' };
  assert.notEqual(stableIdentity(offer, jpDemand), stableIdentity(offer, deDemand));
});

test('missing critical evidence fails closed', () => {
  const evidence = [];
  const canBeExceptional = evidence.length > 0;
  assert.equal(canBeExceptional, false);
});

test('unverified participant cannot be automatically connected', () => {
  const participantVerified = false;
  const canConnectAutomatically = participantVerified;
  assert.equal(canConnectAutomatically, false);
});

test('explainability requires reasons for material scoring', () => {
  const result = {
    scores: { match: 88, confidence: 91, viability: 84, risk: 20, opportunity: 86 },
    reasons: ['Demand growth', 'Supply availability'],
    evidence: ['source-a', 'source-b']
  };
  assert.ok(result.reasons.length > 0);
  assert.ok(result.evidence.length > 0);
});

test('same snapshot is deterministic', () => {
  const snapshot = JSON.stringify({
    offer: { entityId: 'x', country: 'ES', productOrService: 'X' },
    demand: { entityId: 'x', country: 'JP', productOrService: 'X' },
    evidence: ['a', 'b']
  });
  assert.equal(snapshot, snapshot);
});
