import { normalizeBatch } from '../normalizer/opportunity-normalizer.js';
import { processBatch } from './opportunity-pipeline.js';

/**
 * Run the canonical NEWBASE flow in one deterministic operation.
 * Connector output enters here; no source-specific logic belongs in this layer.
 */
export function runNewbase(records, context = {}, options = {}) {
  const normalized = normalizeBatch(records, context);
  const results = processBatch(normalized, options);

  return {
    inputCount: Array.isArray(records) ? records.length : 0,
    normalizedCount: normalized.length,
    results,
    accepted: results.filter((item) => item.status === 'accepted'),
    rejected: results.filter((item) => item.status === 'rejected'),
  };
}
