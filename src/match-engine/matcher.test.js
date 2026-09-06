import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMatchCandidates, normalizeProduct } from './matcher.js';

const strongOffer = {
  entityId: 'supplier-es',
  country: 'ES',
  productOrService: 'solar panels',
  signals: { marketGap: 95, availability: 95, commercialEvidence: 95, freshness: 95, sourceQuality: 95 },
  viability: 95,
  risk: 10
};

const strongDemand = {
  entityId: 'buyer-fr',
  country: 'FR',
  productOrService: 'panneaux solaires',
  signals: { demand: 95, growth: 90 }
};

test('normalizes cross-language product synonyms to one identity', () => {
  assert.equal(normalizeProduct('solar panels'), 'solar-panels');
  assert.equal(normalizeProduct('panneaux solaires'), 'solar-panels');
  assert.equal(normalizeProduct('paneles solares'), 'solar-panels');
});

test('generates a directional cross-border candidate', () => {
  const [candidate] = generateMatchCandidates([strongOffer], [strongDemand], {
    participantVerified: false,
    geographyFit: 100
  });

  assert.ok(candidate);
  assert.equal(candidate.offer.country, 'ES');
  assert.equal(candidate.demand.country, 'FR');
  assert.equal(candidate.offer.productOrService, 'solar-panels');
  assert.equal(candidate.demand.productOrService, 'solar-panels');
  assert.equal(candidate.status, 'candidate');
  assert.equal(candidate.classification, 'candidate');
  assert.ok(candidate.scores.match >= 90);
});

test('does not match incompatible products', () => {
  const demand = { ...strongDemand, productOrService: 'olive oil' };
  assert.equal(generateMatchCandidates([strongOffer], [demand]).length, 0);
});

test('does not match an entity to itself', () => {
  const demand = { ...strongDemand, entityId: strongOffer.entityId };
  assert.equal(generateMatchCandidates([strongOffer], [demand]).length, 0);
});

test('keeps unverified participants as candidates even with strong scores', () => {
  const [candidate] = generateMatchCandidates([strongOffer], [strongDemand], {
    participantVerified: false,
    geographyFit: 100
  });
  assert.equal(candidate.classification, 'candidate');
  assert.ok(candidate.scores.opportunity > 0);
});

test('weak evidence cannot become exceptional', () => {
  const offer = {
    ...strongOffer,
    signals: { marketGap: 98, availability: 98, commercialEvidence: 30, freshness: 20, sourceQuality: 30 },
    viability: 95
  };
  const [candidate] = generateMatchCandidates([offer], [strongDemand], {
    participantVerified: true,
    geographyFit: 100
  });
  assert.ok(candidate);
  assert.notEqual(candidate.classification, 'exceptional');
  assert.ok(candidate.scores.confidence < 70);
});

test('duplicate pairs are emitted once', () => {
  const candidates = generateMatchCandidates(
    [strongOffer, { ...strongOffer }],
    [strongDemand, { ...strongDemand }],
    { participantVerified: false }
  );
  assert.equal(candidates.length, 1);
});

test('same snapshot produces deterministic ordering and identity', () => {
  const first = generateMatchCandidates([strongOffer], [strongDemand]);
  const second = generateMatchCandidates([strongOffer], [strongDemand]);
  assert.deepEqual(first, second);
});
