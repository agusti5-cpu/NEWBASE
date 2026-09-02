import { scoreOpportunity } from '../engine/opportunity.js';
import { checkLegalSource } from '../engine/legal.js';

export function processSource(source, records = []) {
  const gate = checkLegalSource(source);
  if (!gate.allowed) {
    return { accepted: [], rejected: records.length, reasons: gate.reasons };
  }

  const accepted = records
    .map(record => scoreOpportunity({
      ...record,
      source: source.id,
      legal: true,
      authorizedAccess: true
    }))
    .filter(record => record.score >= 70);

  return { accepted, rejected: records.length - accepted.length, reasons: [] };
}

// Connectors will call processSource(). No connector is enabled by default.
