export function checkLegalSource(source) {
  if (!source || typeof source !== 'object') {
    return { allowed: false, reasons: ['missing-source'] };
  }

  const reasons = [];

  if (source.scraping === true) {
    reasons.push('scraping-not-authorized');
  }

  if (source.authorizedAccess !== true) {
    reasons.push('access-not-authorized');
  }

  if (source.termsReviewed !== true) {
    reasons.push('terms-not-reviewed');
  }

  if (source.cost !== 0) {
    reasons.push('non-zero-cost');
  }

  if (source.subscriptionRequired === true) {
    reasons.push('subscription-required');
  }

  if (source.affiliateRequired === true) {
    reasons.push('affiliate-required');
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}
