import { strict as assert } from 'node:assert';
import { scoreCandidate, evaluateOpportunity } from '../engine/opportunity-engine.js';

const baseCandidate = {
  id: 'selection-quality-v2-1',
  category: 'trade',
  productOrService: 'example',
  originMarket: 'CN',
  targetMarket: 'ES',
  observedAt: '2026-09-03T00:00:00Z',
  source: { name: 'Official source', type: 'official' },
  signals: { demand: 80, growth: 80, marketGap: 80, availability: 80 },
  confidence: 0.8,
  legal: { status: 'allowed' }
};

// Commercial evidence is integrated into the quality score without changing
// the legal and confidence gates.
assert.equal(scoreCandidate({ ...baseCandidate, commercialEvidence: { source: 'verified' } }), 82);
assert.equal(scoreCandidate({ ...baseCandidate, commercialEvidence: { source: 'partial' } }), 77);
assert.equal(scoreCandidate({ ...baseCandidate }), 80);

// Strong evidence must improve an otherwise identical candidate, while
// missing evidence remains neutral rather than penalizing the candidate.
assert.ok(
  scoreCandidate({ ...baseCandidate, commercialEvidence: { source: 'verified' } }) >
    scoreCandidate({ ...baseCandidate })
);
assert.equal(
  scoreCandidate({ ...baseCandidate, commercialEvidence: undefined }),
  scoreCandidate({ ...baseCandidate })
);

// Quality thresholds remain authoritative.
assert.equal(evaluateOpportunity({ ...baseCandidate, commercialEvidence: { source: 'verified' } }).status, 'accepted');
assert.equal(evaluateOpportunity({ ...baseCandidate, confidence: 0.59, commercialEvidence: { source: 'verified' } }).status, 'rejected');
assert.equal(evaluateOpportunity({ ...baseCandidate, legal: { status: 'blocked' }, commercialEvidence: { source: 'verified' } }).status, 'rejected');

console.log('tests/selection-quality-v2: OK');
