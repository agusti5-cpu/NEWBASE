import assert from 'node:assert/strict';
import test from 'node:test';
import { runNewbase } from '../engine/newbase-pipeline.js';

const validCandidate = {
  id: 'test-001',
  category: 'consum',
  productOrService: 'Producte de prova',
  originMarket: 'ES',
  targetMarket: 'ES',
  source: { name: 'Test Source', type: 'official', url: 'https://example.com/data' },
  observedAt: '2026-09-02T00:00:00.000Z',
  signals: { demand: 90, growth: 85, marketGap: 80, availability: 90 },
  confidence: 0.95,
  legal: { status: 'allowed', reason: 'test' },
};

test('NEWBASE executes the complete opportunity flow', () => {
  const output = runNewbase([validCandidate]);

  assert.equal(output.inputCount, 1);
  assert.equal(output.normalizedCount, 1);
  assert.equal(output.accepted.length, 1);
  assert.equal(output.rejected.length, 0);
  assert.equal(output.accepted[0].opportunityId, 'test-001');
  assert.equal(output.accepted[0].status, 'accepted');
  assert.ok(output.accepted[0].score >= 60);
});

test('NEWBASE rejects a legally blocked opportunity', () => {
  const output = runNewbase([{ ...validCandidate, legal: { status: 'blocked' } }]);

  assert.equal(output.accepted.length, 0);
  assert.equal(output.rejected.length, 1);
  assert.equal(output.rejected[0].reason, 'LEGAL_BLOCK');
});

test('NEWBASE rejects low-confidence input before scoring', () => {
  const output = runNewbase([{ ...validCandidate, confidence: 0.2 }]);

  assert.equal(output.accepted.length, 0);
  assert.equal(output.rejected.length, 1);
  assert.equal(output.rejected[0].reason, 'LOW_CONFIDENCE');
});
