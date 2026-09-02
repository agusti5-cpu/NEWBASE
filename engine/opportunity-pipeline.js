import { detectDemandTrend } from './demand.js';

/**
 * Build a candidate opportunity from two observations.
 * This does not claim profitability or legal clearance.
 */
export function buildOpportunityCandidate(input) {
  const trend = detectDemandTrend(input.currentDemand, input.previousDemand, input.trendOptions);

  const legal = input.legal ?? {
    accessAuthorized: false,
    licenseReviewed: false,
    commercialUseAllowed: false,
    termsReviewed: false
  };

  const legalReady = Boolean(
    legal.accessAuthorized &&
    legal.licenseReviewed &&
    legal.commercialUseAllowed &&
    legal.termsReviewed
  );

  if (!trend.detected || !legalReady) {
    return {
      status: 'blocked',
      reason: !trend.detected ? 'no-meaningful-demand-trend' : 'legal-validation-required',
      trend,
      legal
    };
  }

  const score = Math.min(100, Math.round(50 + Math.min(40, trend.growthRate * 100) + 10));

  return {
    status: 'candidate',
    score,
    signal: 'demand-growth',
    trend,
    legal,
    profitability: 'unknown',
    requiresFurtherValidation: true
  };
}
