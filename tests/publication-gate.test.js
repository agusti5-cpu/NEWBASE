import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePublication, validatePublicationEvidence } from '../engine/publication-gate.js';

const accepted = (overrides = {}) => ({
  status: 'accepted',
  score: 82,
  level: 'medium',
  opportunityId: 'opp-1',
  opportunity: {
    id: 'opp-1',
    category: 'trade',
    productOrService: 'example',
    originMarket: 'ES',
    targetMarket: 'FR',
    observedAt: '2026-09-02T18:00:00Z',
    source: { name: 'Official source', type: 'official' },
    evidence: {
      sourceUrl: 'https://example.com/data/1',
      sourceName: 'Official source',
      observedAt: '2026-09-02T18:00:00Z',
      summary: 'Official source record supports the detected signal.'
    },
    ...overrides
  }
});

test('accepted opportunity with complete matching evidence is publishable', () => {
  const result = preparePublication(accepted());
  assert.equal(result.status, 'publishable');
  assert.equal(result.opportunityId, 'opp-1');
});

test('accepted opportunity without evidence is not publishable', () => {
  const candidate = accepted();
  delete candidate.opportunity.evidence;
  const result = preparePublication(candidate);
  assert.equal(result.status, 'not_publishable');
  assert.equal(result.reason, 'PUBLICATION_EVIDENCE_REQUIRED');
});

test('evidence source mismatch blocks publication', () => {
  const candidate = accepted();
  candidate.opportunity.evidence.sourceName = 'Different source';
  const result = validatePublicationEvidence(candidate.opportunity);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('EVIDENCE_SOURCE_MISMATCH'));
});

test('rejected opportunity can never enter publication', () => {
  const result = preparePublication({ status: 'rejected', opportunityId: 'opp-2' });
  assert.deepEqual(result, { status: 'not_publishable', reason: 'OPPORTUNITY_NOT_ACCEPTED' });
});
