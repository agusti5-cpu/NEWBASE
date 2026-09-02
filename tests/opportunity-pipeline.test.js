import { strict as assert } from 'node:assert';
import { buildOpportunityCandidate } from '../engine/opportunity-pipeline.js';

const legal = {
  accessAuthorized: true,
  licenseReviewed: true,
  commercialUseAllowed: true,
  termsReviewed: true
};

const candidate = buildOpportunityCandidate({
  previousDemand: 100,
  currentDemand: 150,
  legal
});

assert.equal(candidate.status, 'candidate');
assert.equal(candidate.signal, 'demand-growth');
assert.equal(candidate.profitability, 'unknown');

const blockedTrend = buildOpportunityCandidate({
  previousDemand: 100,
  currentDemand: 105,
  legal
});
assert.equal(blockedTrend.status, 'blocked');

const blockedLegal = buildOpportunityCandidate({
  previousDemand: 100,
  currentDemand: 150,
  legal: { ...legal, commercialUseAllowed: false }
});
assert.equal(blockedLegal.status, 'blocked');
assert.equal(blockedLegal.reason, 'legal-validation-required');

console.log('NEWBASE opportunity pipeline tests: PASS');
