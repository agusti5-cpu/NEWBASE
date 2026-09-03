import { strict as assert } from 'node:assert';
import { commercialEvidenceScore } from '../engine/commercial-signal.js';

// Missing commercial evidence must remain neutral.
assert.equal(commercialEvidenceScore(null), 0);
assert.equal(commercialEvidenceScore(undefined), 0);
assert.equal(commercialEvidenceScore({}), 0);

// Existing evidence scoring remains deterministic and bounded.
assert.equal(commercialEvidenceScore({ source: 'verified' }), 100);
assert.equal(commercialEvidenceScore({ source: 'partial' }), 50);
assert.equal(commercialEvidenceScore({ a: 'verified', b: 'partial' }), 75);
assert.equal(commercialEvidenceScore({ a: ['confirmed', 'medium'] }), 75);
assert.ok(commercialEvidenceScore({ a: 'verified', b: 'partial', c: 'unknown' }) <= 100);

console.log('tests/commercial-signal: OK');
