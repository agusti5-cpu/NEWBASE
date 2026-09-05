const test = require('node:test');
const assert = require('node:assert/strict');
const { observeOpportunity } = require('../engine/opportunity-observer');

test('scores an independent TED demand observation without enabling action', () => {
  const result = observeOpportunity({
    offer: {
      id: 'offer-1',
      title: 'Office desks and chairs',
      description: 'Furniture for an office'
    },
    demandEvidence: {
      id: 'ted-1',
      source: 'eu-ted-procurement',
      title: 'Supply of office furniture',
      description: 'Office desks and chairs',
      keywords: ['office', 'furniture'],
      score: 80,
      participantVerified: false
    }
  });

  assert.equal(result.mode, 'observationOnly');
  assert.equal(result.source, 'eu-ted-procurement');
  assert.equal(result.participantVerified, false);
  assert.equal(result.actionAllowed, false);
  assert.ok(result.opportunityScore >= 0 && result.opportunityScore <= 100);
});

test('rejects verified demand from the observation-only path', () => {
  const result = observeOpportunity({
    offer: { id: 'offer-2', title: 'Office furniture' },
    demandEvidence: {
      id: 'demand-2',
      source: 'eu-ted-procurement',
      title: 'Office furniture tender',
      keywords: ['office'],
      score: 50,
      participantVerified: true
    }
  });

  assert.equal(result, null);
});
