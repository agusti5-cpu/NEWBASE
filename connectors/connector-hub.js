/**
 * NEWBASE connector hub.
 *
 * The hub is deliberately conservative: a source is executable only when
 * there is a registered connector and the source configuration satisfies the
 * mandatory zero-cost/legal rules. Missing connectors are reported as
 * unavailable instead of being silently guessed or scraped.
 */

import sourcesConfig from '../config/sources.json' with { type: 'json' };
import ineRetail from './ine-retail-index.js';
import datosGobEs from './datos-gob-es.js';
import dataGovSg from './data-gov-sg.js';
import dataGovSgSearch from './data-gov-sg-search.js';
import unComtrade from './un-comtrade-trade.js';

const CONNECTORS = new Map([
  ['es-datos-gob', datosGobEs],
  ['es-ine-retail-75808', ineRetail],
  ['sg-data-gov', dataGovSg],
  ['un-comtrade-preview', unComtrade],
]);

const REQUIRED_RULES = [
  'require_authorized_access',
  'prefer_official_api',
  'require_zero_cost',
  'require_no_subscription',
  'require_no_affiliate',
];

function validateSource(source, rules) {
  const errors = [];
  if (!source || typeof source !== 'object') return ['SOURCE_MUST_BE_OBJECT'];
  if (rules.require_authorized_access && source.status !== 'validated') errors.push('SOURCE_NOT_VALIDATED');
  if (rules.require_zero_cost && source.cost !== 0) errors.push('NON_ZERO_COST');
  if (rules.require_no_subscription && source.subscription_required === true) errors.push('SUBSCRIPTION_REQUIRED');
  if (rules.require_no_affiliate && source.affiliate_required === true) errors.push('AFFILIATE_REQUIRED');
  return errors;
}

export function listConnectors() {
  return sourcesConfig.sources.map((source) => ({
    id: source.id,
    region: source.region,
    status: CONNECTORS.has(source.id) ? 'ready' : 'unavailable',
    validationErrors: validateSource(source, sourcesConfig.rules),
  }));
}

export function getConnector(sourceId) {
  if (typeof sourceId !== 'string' || !sourceId.trim()) {
    return { status: 'unavailable', reason: 'SOURCE_ID_REQUIRED' };
  }

  const source = sourcesConfig.sources.find((item) => item.id === sourceId);
  if (!source) return { status: 'unavailable', reason: 'UNKNOWN_SOURCE' };

  const validationErrors = validateSource(source, sourcesConfig.rules);
  if (validationErrors.length) {
    return { status: 'blocked', source, reason: 'SOURCE_RULES_FAILED', validationErrors };
  }

  const connector = CONNECTORS.get(sourceId);
  if (!connector) return { status: 'unavailable', source, reason: 'CONNECTOR_NOT_IMPLEMENTED' };

  return { status: 'ready', source, connector };
}

export async function runConnector(sourceId, method, options = {}) {
  const result = getConnector(sourceId);
  if (result.status !== 'ready') return result;

  if (typeof method !== 'string' || typeof result.connector[method] !== 'function') {
    return { status: 'error', source: result.source, reason: 'CONNECTOR_METHOD_NOT_FOUND' };
  }

  try {
    const data = await result.connector[method](options);
    return { status: 'success', source: result.source, data };
  } catch (error) {
    return {
      status: 'error',
      source: result.source,
      reason: 'CONNECTOR_EXECUTION_FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Auxiliary connectors are kept available for future dataset-level wiring;
// they are not treated as activated sources until their source entry is
// explicitly registered and validated.
export const auxiliaryConnectors = { dataGovSgSearch };

export { REQUIRED_RULES };
export default { listConnectors, getConnector, runConnector };
