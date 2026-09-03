/**
 * NEWBASE connector orchestrator.
 * Executes validated connectors independently. Sources that need a
 * dataset/indicator/trade configuration are reported as configuration_required
 * instead of being called with invented parameters.
 */
import { listConnectors, runConnector } from './connector-hub.js';

const DEFAULT_METHODS = {
  'es-datos-gob': 'searchDatasets',
  'es-ine-retail-75808': 'getRetailOpportunityCandidates',
  'sg-data-gov': 'listDatasets',
};

const REQUIRED_CONFIGURATION = new Set([
  'eu-data-europa',
  'jp-estat-dashboard',
  'un-comtrade-preview',
]);

export async function runAllConnectors(options = {}) {
  const sources = listConnectors();
  const results = [];

  for (const source of sources) {
    if (source.status !== 'ready') {
      results.push({ id: source.id, status: source.status, validationErrors: source.validationErrors });
      continue;
    }

    const suppliedOptions = options[source.id] || {};
    const hasExplicitMethod = typeof options.methods?.[source.id] === 'string';
    const method = options.methods?.[source.id] || DEFAULT_METHODS[source.id];

    if (!method) {
      if (REQUIRED_CONFIGURATION.has(source.id) && !hasExplicitMethod) {
        results.push({ id: source.id, status: 'configuration_required', reason: 'SOURCE_PARAMETERS_REQUIRED' });
      } else {
        results.push({ id: source.id, status: 'unavailable', reason: 'CONNECTOR_METHOD_NOT_CONFIGURED' });
      }
      continue;
    }

    results.push({ id: source.id, ...(await runConnector(source.id, method, suppliedOptions)) });
  }

  const errors = results.filter((item) => item.status === 'error');
  return {
    status: errors.length ? 'partial' : 'success',
    total: results.length,
    succeeded: results.filter((item) => item.status === 'success').length,
    configurationRequired: results.filter((item) => item.status === 'configuration_required').length,
    errors: errors.length,
    results,
  };
}

export default { runAllConnectors };
