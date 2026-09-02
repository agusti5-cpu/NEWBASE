import { getRetailOpportunityCandidates } from '../connectors/ine-retail-index.js';
import { runNewbase } from '../engine/newbase-pipeline.js';

/**
 * Execute the first real NEWBASE detector end-to-end using the official INE
 * retail index connector. The runner is deliberately source-specific; the
 * engine remains source-agnostic.
 */
export async function runIneDetector(options = {}) {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const candidates = await getRetailOpportunityCandidates({
    ...options,
    observedAt,
  });

  const result = runNewbase(candidates, { observedAt });

  return {
    source: 'es-ine-retail-75808',
    observedAt,
    inputCount: result.inputCount,
    normalizedCount: result.normalizedCount,
    accepted: result.accepted,
    rejected: result.rejected,
  };
}

export default runIneDetector;

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runIneDetector();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
