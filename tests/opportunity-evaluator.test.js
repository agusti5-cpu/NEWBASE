import { strict as assert } from 'node:assert';
import {
  validateNormalizedOpportunity,
  evaluateNormalizedOpportunity
} from '../engine/opportunity-evaluator.js';

const opportunity = {
  id: 'demo-001',
  category: 'consumer',
  productOrService: 'Example product',
  originMarket: 'EU',
  targetMarket: 'ES',
  source: { name: 'Example Open Data', type: 'open_data' },
  observedAt: '2026-09-02T17:00:00Z',
  signals: { demand: 90, growth: 80, marketGap: 75, availability: 85 },
  confidence: 0.9,
  legal: { status: 'allowed', reason: 'Example test data' }
};

assert.equal(validateNormalizedOpportunity(opportunity).valid, true);

const accepted = evaluateNormalizedOpportunity(opportunity);
assert.equal(accepted.status, 'accepted');
assert.equal(accepted.opportunityId, 'demo-001');
assert.equal(accepted.level, 'medium');

const blocked = evaluateNormalizedOpportunity({
  ...opportunity,
  id: 'blocked-001',
  legal: { status: 'blocked', reason: 'test' }
});
assert.equal(blocked.status, 'rejected');
assert.equal(blocked.reason, 'LEGAL_BLOCK');

const invalid = evaluateNormalizedOpportunity({
  ...opportunity,
  signals: { ...opportunity.signals, demand: 101 }
});
assert.equal(invalid.stage, 'validation');
assert.equal(invalid.status, 'rejected');

console.log('NEWBASE normalized evaluator tests: PASS');
