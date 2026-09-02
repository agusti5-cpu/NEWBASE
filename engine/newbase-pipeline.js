import { normalizeBatch } from '../normalizer/opportunity-normalizer.js';
import { processBatch } from './opportunity-pipeline.js';
import { preparePublication } from './publication-gate.js';

/**
 * Run the canonical NEWBASE flow in one deterministic operation.
 * Connector output enters here; no source-specific logic belongs in this layer.
 */
export function runNewbase(records, context = {}, options = {}) {
  const normalized = normalizeBatch(records, context);
  const results = processBatch(normalized, options);
  const publication = results.map(preparePublication);

  return {
    inputCount: Array.isArray(records) ? records.length : 0,
    normalizedCount: normalized.length,
    results,
    accepted: results.filter((item) => item.status === 'accepted'),
    rejected: results.filter((item) => item.status === 'rejected'),
    publishable: publication.filter((item) => item.status === 'publishable'),
    notPublishable: publication.filter((item) => item.status === 'not_publishable'),
  };
}
