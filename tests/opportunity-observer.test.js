import test from 'node:test';
import assert from 'node:assert/strict';
import { observeOpportunity } from '../engine/opportunity-observer.js';

test('scores an independent TED demand observation without enabling action', () => {
  const result = observeOpportunity({
    offer: {
      id: 'offer-1',
      title: 'Office desks and chairs',
      description: 'Furniture for an office'
    },
    demandEvidence: {
      publicationNumber: 'ted-1',
      country: 'ES',
      title: 'Supply of office furniture',
      productOrService: 'office furniture',
      demandScore: 80
    }
  });

  assert.equal(result.mode, 'observationOnly');
  assert.equal(result.source, 'eu-ted-procurement');
  assert.equal(result.participantVerified, false);
  assert.equal(result.actionAllowed, false);
  assert.ok(result.opportunityScore >= 0 && result.opportunityScore <= 100);
});

test('returns null when independent demand evidence is incomplete', () => {
  const result = observeOpportunity({
    offer: { id: 'offer-2', title: 'Office furniture' },
    demandEvidence: { country: 'ES', title: 'Office furniture tender' }
  });

  assert.equal(result, null);
});
