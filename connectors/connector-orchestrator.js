/**
 * NEWBASE connector orchestrator.
 * Executes every validated, implemented connector independently.
 * A failing source never prevents other sources from running.
 */
import { listConnectors, runConnector } from './connector-hub.js';

export async function runAllConnectors(options = {}) {
  const sources = listConnectors();
  const results = [];

  for (const source of sources) {
    if (source.status !== 'ready') {
      results.push({ id: source.id, status: source.status, validationErrors: source.validationErrors });
      continue;
    }

    const method = options.methods?.[source.id] || options.defaultMethod || 'fetch';
    results.push({ id: source.id, ...(await runConnector(source.id, method, options[source.id] || {})) });
  }

  return {
    status: results.some((item) => item.status === 'error') ? 'partial' : 'success',
    total: results.length,
    ready: results.filter((item) => item.status === 'success').length,
    results,
  };
}

export default { runAllConnectors };
