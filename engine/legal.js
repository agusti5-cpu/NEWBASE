export function checkLegalSource(source) {
  if (!source || typeof source !== 'object') {
    return { allowed: false, reasons: ['missing-source'] };
  }

  const reasons = [];

  if (source.scraping === true) reasons.push('scraping-not-authorized');
  if (source.authorizedAccess !== true) reasons.push('access-not-authorized');
  if (source.termsReviewed !== true) reasons.push('terms-not-reviewed');
  if (source.cost !== 0) reasons.push('non-zero-cost');
  if (source.subscriptionRequired === true) reasons.push('subscription-required');
  if (source.affiliateRequired === true) reasons.push('affiliate-required');

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Legal gate used by the automated pipeline.
 * A missing legal context is a hard block, never an approval.
 */
export function legalGate(candidate, context = {}) {
  const source = {
    scraping: Boolean(context.scraping),
    authorizedAccess: Boolean(context.authorizedAccess),
    termsReviewed: Boolean(context.termsReviewed),
    cost: context.cost ?? 0,
    subscriptionRequired: Boolean(context.subscriptionRequired),
    affiliateRequired: Boolean(context.affiliateRequired),
  };

  const result = checkLegalSource(source);

  return {
    ...candidate,
    legal: result.allowed,
    legalReasons: result.reasons,
    legalCheckedAt: new Date().toISOString(),
  };
}
