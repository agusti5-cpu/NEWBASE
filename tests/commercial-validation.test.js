import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialValidationSummary, validateCommercialEvidence } from '../engine/commercial-validation.js';

const opportunity = (evidence) => ({ commercialValidation: { evidence } });

const validEvidence = [
  {
    type: 'demand',
    sourceName: 'Demand source',
    sourceUrl: 'https://example.com/demand',
    observedAt: '2026-09-03T09:00:00Z'
  },
  {
    type: 'economics',
    sourceName: 'Economics source',
    sourceUrl: 'https://example.org/economics',
    observedAt: '2026-09-03T09:00:00Z'
  }
];

test('two independent demand and economics records validate', () => {
  const result = validateCommercialEvidence(opportunity(validEvidence));
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('missing commercial validation fails closed', () => {
  const result = validateCommercialEvidence({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('MISSING_COMMERCIAL_VALIDATION'));
});

test('one source cannot satisfy independence', () => {
  const result = validateCommercialEvidence(opportunity([
    { ...validEvidence[0], sourceName: 'Same source' },
    { ...validEvidence[1], sourceName: 'Same source' }
  ]));
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('COMMERCIAL_EVIDENCE_NOT_INDEPENDENT'));
});

test('summary exposes only validated structure', () => {
  const result = commercialValidationSummary(opportunity(validEvidence));
  assert.equal(result.valid, true);
  assert.equal(result.evidenceCount, 2);
  assert.equal(result.sourceCount, 2);
  assert.deepEqual(result.signalTypes, ['demand', 'economics']);
});
