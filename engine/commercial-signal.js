/**
 * NEWBASE — Commercial Evidence Signal
 * Deterministic, bounded and source-traceable. Missing evidence is neutral.
 */

const POSITIVE = new Set(['verified', 'strong', 'high', 'confirmed']);
const PARTIAL = new Set(['partial', 'medium', 'moderate']);
const REQUIRED_PRODUCT_TYPES = new Set(['demand', 'economics']);

function scoreStatusValues(evidence) {
  const values = Object.values(evidence)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => String(value ?? '').trim().toLowerCase());

  if (!values.length) return 0;

  const positive = values.filter(value => POSITIVE.has(value)).length;
  const partial = values.filter(value => PARTIAL.has(value)).length;
  return Math.min(100, Math.round(((positive + partial * 0.5) / values.length) * 100));
}

/**
 * Score either the legacy status-map shape or the real commercialValidation
 * evidence shape produced by the enrichment stage. Context-only evidence is
 * deliberately worth zero: INE/Eurostat cannot open the commercial gate.
 */
export function commercialEvidenceScore(evidence) {
  if (!evidence || typeof evidence !== 'object') return 0;

  if (Array.isArray(evidence.evidence)) {
    const productItems = evidence.evidence.filter(
      item => item && typeof item === 'object' && item.evidenceLevel === 'product'
    );
    const productTypes = new Set(productItems.map(item => item.type));
    const covered = [...REQUIRED_PRODUCT_TYPES].filter(type => productTypes.has(type)).length;

    if (covered === REQUIRED_PRODUCT_TYPES.size) return 100;
    if (covered === 1) return 50;
    return 0;
  }

  return scoreStatusValues(evidence);
}

export default { commercialEvidenceScore };
