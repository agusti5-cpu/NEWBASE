/**
 * NEWBASE — Commercial Evidence Signal
 * Deterministic, bounded and source-traceable. Missing evidence is neutral.
 */

const POSITIVE = new Set(['verified', 'strong', 'high', 'confirmed']);
const PARTIAL = new Set(['partial', 'medium', 'moderate']);

export function commercialEvidenceScore(evidence) {
  if (!evidence || typeof evidence !== 'object') return 0;

  const values = Object.values(evidence)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => String(value ?? '').trim().toLowerCase());

  if (!values.length) return 0;

  const positive = values.filter(value => POSITIVE.has(value)).length;
  const partial = values.filter(value => PARTIAL.has(value)).length;
  const total = values.length;

  return Math.min(100, Math.round(((positive + partial * 0.5) / total) * 100));
}

export default { commercialEvidenceScore };
