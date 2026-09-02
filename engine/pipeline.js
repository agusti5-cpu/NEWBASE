/**
 * NEWBASE automated opportunity pipeline.
 *
 * Connector -> normalization -> signal detection -> legal gate -> scoring.
 * The pipeline never treats a detected signal as a confirmed business.
 */

import { scoreOpportunity } from './opportunity.js';
import { legalGate } from './legal.js';

const SIGNALS = [
  ['export', 'export'],
  ['import', 'import'],
  ['procurement', 'procurement'],
  ['tender', 'tender'],
  ['grant', 'grant'],
  ['subsidy', 'subsidy'],
  ['startup', 'startup'],
  ['business', 'business'],
  ['price', 'price'],
  ['market', 'market'],
];

export function detectSignals(record) {
  const text = JSON.stringify(record).toLowerCase();
  return SIGNALS.filter(([term]) => text.includes(term)).map(([, type]) => type);
}

export function processRecord(record, context = {}) {
  const signals = detectSignals(record);
  if (!signals.length) return null;

  const candidate = {
    ...record,
    category: signals[0],
    signals,
    market: context.market ?? record.market ?? 'WORLD',
    language: context.language ?? record.language ?? 'en',
    legal: false,
    authorizedAccess: Boolean(context.authorizedAccess),
  };

  const gated = legalGate(candidate, context);
  return scoreOpportunity(gated);
}

export function processBatch(records, context = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  return records.map((record) => processRecord(record, context)).filter(Boolean);
}
