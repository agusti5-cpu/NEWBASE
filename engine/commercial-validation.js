/**
 * NEWBASE — Commercial validation gate.
 *
 * A trade-flow signal is not a commercial opportunity by itself. Publication
 * requires corroborated product-level commercial evidence from independent
 * sources. Macro context is useful for scoring/context but cannot open the gate.
 * This module is deterministic and never invents evidence.
 */

const REQUIRED_SIGNAL_TYPES = Object.freeze(['demand', 'economics']);

function validEvidenceItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.type !== 'string' || !item.type.trim()) return false;
  if (typeof item.sourceName !== 'string' || !item.sourceName.trim()) return false;
  if (typeof item.sourceUrl !== 'string' || !item.sourceUrl.trim()) return false;
  if (typeof item.observedAt !== 'string' || !item.observedAt.trim()) return false;

  try {
    const url = new URL(item.sourceUrl);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate commercial corroboration attached to an opportunity.
 *
 * Rules:
 * - at least two valid evidence records;
 * - at least two distinct source names;
 * - demand and economics evidence must both be present at product level;
 * - every record must have a traceable HTTP(S) source and timestamp.
 *
 * Context records such as INE/Eurostat remain valid records but cannot satisfy
 * the required product-level signals.
 */
export function validateCommercialEvidence(opportunity) {
  const errors = [];
  const evidence = opportunity?.commercialValidation;
  const items = evidence?.evidence;

  if (!evidence || typeof evidence !== 'object') {
    return { valid: false, errors: ['MISSING_COMMERCIAL_VALIDATION'] };
  }

  if (!Array.isArray(items) || items.length < 2) {
    errors.push('INSUFFICIENT_COMMERCIAL_EVIDENCE');
  }

  const validItems = Array.isArray(items) ? items.filter(validEvidenceItem) : [];
  if (validItems.length !== (Array.isArray(items) ? items.length : 0)) {
    errors.push('INVALID_COMMERCIAL_EVIDENCE_RECORD');
  }

  const sourceNames = new Set(validItems.map((item) => item.sourceName));
  if (sourceNames.size < 2) {
    errors.push('COMMERCIAL_EVIDENCE_NOT_INDEPENDENT');
  }

  const productItems = validItems.filter((item) => item.evidenceLevel === 'product');
  const productTypes = new Set(productItems.map((item) => item.type));
  for (const type of REQUIRED_SIGNAL_TYPES) {
    if (!productTypes.has(type)) errors.push(`MISSING_PRODUCT_${type.toUpperCase()}_EVIDENCE`);
  }

  return { valid: errors.length === 0, errors };
}

export function commercialValidationSummary(opportunity) {
  const result = validateCommercialEvidence(opportunity);
  const evidence = opportunity?.commercialValidation?.evidence;
  const items = Array.isArray(evidence) ? evidence : [];
  const validItems = items.filter(validEvidenceItem);

  return {
    valid: result.valid,
    errors: result.errors,
    evidenceCount: items.length,
    sourceCount: new Set(validItems.map((item) => item.sourceName)).size,
    signalTypes: [...new Set(validItems.map((item) => item.type))].sort(),
    productSignalTypes: [...new Set(validItems.filter((item) => item.evidenceLevel === 'product').map((item) => item.type))].sort(),
  };
}
