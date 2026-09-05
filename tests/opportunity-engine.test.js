import { strict as assert } from 'node:assert';
import { scoreCandidate, evaluateOpportunity } from '../engine/opportunity-engine.js';

const base = {
  signals: { demand: 80, growth: 80, marketGap: 80, availability: 80 },
  confidence: 0.8,
  legal: { status: 'allowed' }
};

// Canonical enriched commercialValidation must be consumed by the scoring engine.
const strongCommercial = {
  evidence: [
    { type: 'demand', evidenceLevel: 'product' },
    { type: 'economics', evidenceLevel: 'product' }
  ]
};

const withoutCommercial = scoreCandidate({ ...base });
const withCommercial = scoreCandidate({ ...base, commercialValidation: strongCommercial });
assert.ok(withCommercial > withoutCommercial);

// Missing commercial evidence must remain a real zero contribution; the other
// signals must not be renormalized upward to compensate for it.
assert.equal(withoutCommercial, 76);
assert.equal(withCommercial, 86);

// Context-only evidence must not receive product-level commercial credit.
const contextOnly = {
  evidence: [
    { type: 'demand_context', evidenceLevel: 'context' },
    { type: 'economics_context', evidenceLevel: 'context' }
  ]
};
assert.equal(scoreCandidate({ ...base, commercialValidation: contextOnly }), withoutCommercial);

// Legacy commercialEvidence remains supported.
assert.ok(scoreCandidate({ ...base, commercialEvidence: { source: 'verified' } }) > withoutCommercial);

const evaluated = evaluateOpportunity({ ...base, commercialValidation: strongCommercial });
assert.equal(evaluated.status, 'accepted');
assert.equal(evaluated.reason, 'QUALITY_THRESHOLD_MET');

console.log('NEWBASE opportunity-engine tests: PASS');
