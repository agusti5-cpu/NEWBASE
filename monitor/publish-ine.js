import { runIneDetector } from './run-ine.js';

/**
 * Produce the small public machine-readable output of the detector.
 * Rejected raw records are intentionally not published; only accepted
 * opportunities cross the quality threshold.
 */
export async function buildInePublication(options = {}) {
  const run = await runIneDetector(options);

  return {
    schemaVersion: 1,
    detector: run.source,
    observedAt: run.observedAt,
    inputCount: run.inputCount,
    normalizedCount: run.normalizedCount,
    acceptedCount: run.accepted.length,
    rejectedCount: run.rejected.length,
    opportunities: run.accepted,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const publication = await buildInePublication();
  process.stdout.write(`${JSON.stringify(publication, null, 2)}\n`);
}
