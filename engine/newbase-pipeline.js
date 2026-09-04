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

  // Quality score is the canonical prioritization signal. Keep rejected items
  // available for diagnostics, but expose accepted opportunities highest-first.
  const prioritized = [...results]
    .filter((item) => item.status === 'accepted')
    .sort((a, b) => b.score - a.score || String(a.opportunityId).localeCompare(String(b.opportunityId)));

  const prioritizedPublication = prioritized.map(preparePublication);

  return {
    inputCount: Array.isArray(records) ? records.length : 0,
    normalizedCount: normalized.length,
    results,
    accepted: prioritized,
    rejected: results.filter((item) => item.status === 'rejected'),
    publishable: prioritizedPublication.filter((item) => item.status === 'publishable'),
    notPublishable: publication.filter((item) => item.status === 'not_publishable'),
  };
}
