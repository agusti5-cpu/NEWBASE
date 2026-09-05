import test from 'node:test';
import assert from 'node:assert/strict';
import { observeOpportunity } from '../engine/opportunity-observer.js';

test('classifies a strong independent TED demand observation without enabling action', () => {
  const result = observeOpportunity({
    offer: {
      id: 'offer-1',
      title: 'Office furniture',
      description: 'Desks and chairs for an office',
      productOrService: 'office furniture'
    },
    demandEvidence: {
      publicationNumber: 'ted-1',
      country: 'ES',
      title: 'Supply of office furniture',
      productOrService: 'office furniture',
      demandScore: 90
    }
  });

  assert.equal(result.mode, 'observationOnly');
  assert.equal(result.source, 'eu-ted-procurement');
  assert.equal(result.participantVerified, false);
  assert.equal(result.priorityEligible, false);
  assert.equal(result.actionAllowed, false);
  assert.equal(result.opportunityScore, 94);
  assert.equal(result.observationLevel, 'high');
});

test('low-fit observations are classified but remain non-actionable', () => {
  const result = observeOpportunity({
    offer: { id: 'offer-2', title: 'Accounting software', productOrService: 'software' },
    demandEvidence: {
      publicationNumber: 'ted-2',
      country: 'ES',
      title: 'Supply of office furniture',
      productOrService: 'office furniture',
      demandScore: 90
    }
  });

  assert.equal(result.observationLevel, 'medium');
  assert.equal(result.priorityEligible, false);
  assert.equal(result.actionAllowed, false);
});

test('returns null when independent demand evidence is incomplete', () => {
  const result = observeOpportunity({
    offer: { id: 'offer-3', title: 'Office furniture' },
    demandEvidence: { country: 'ES', title: 'Office furniture tender' }
  });

  assert.equal(result, null);
});
