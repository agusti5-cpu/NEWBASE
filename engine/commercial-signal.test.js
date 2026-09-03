import { strict as assert } from 'node:assert';
import { commercialEvidenceScore } from './commercial-signal.js';

assert.equal(commercialEvidenceScore(null), 0);
assert.equal(commercialEvidenceScore({}), 0);
assert.equal(commercialEvidenceScore({ source: 'verified' }), 100);
assert.equal(commercialEvidenceScore({ source: 'partial' }), 50);
assert.equal(commercialEvidenceScore({ a: 'verified', b: 'partial' }), 75);
assert.equal(commercialEvidenceScore({ a: ['confirmed', 'medium'] }), 75);

console.log('commercial-signal tests: OK');
