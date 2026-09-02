import { strict as assert } from 'node:assert';
import {
  fetchTradePreview,
  normalizeTradeRecord,
  buildTradeOpportunity,
} from '../connectors/un-comtrade-trade.js';

function record(overrides = {}) {
  return {
    period: '2025',
    reporterCode: 724,
    reporterISO: 'ESP',
    reporterDesc: 'Spain',
    flowCode: 'M',
    partnerCode: 0,
    partnerISO: 'W00',
    partnerDesc: 'World',
    cmdCode: '84',
    cmdDesc: 'Machinery',
    primaryValue: 1000000,
    cifvalue: 1000000,
    fobvalue: null,
    netWgt: 100000,
    isReported: true,
    isAggregate: false,
    ...overrides,
  };
}

const payload = { count: 1, error: '', data: [record()] };
const normalized = normalizeTradeRecord(payload);
assert.equal(normalized.period, '2025');
assert.equal(normalized.reporterISO, 'ESP');
assert.equal(normalized.primaryValueUSD, 1000000);
assert.equal(normalized.netWeightKg, 100000);

let requestedUrl = null;
const fetched = await fetchTradePreview({
  reporterCode: 724,
  period: 2025,
  flowCode: 'M',
  partnerCode: 0,
  cmdCode: '84',
  fetchImpl: async (url) => {
    requestedUrl = String(url);
    return { ok: true, json: async () => payload };
  },
});
assert.equal(fetched.count, 1);
assert.match(requestedUrl, /reportercode=724/);
assert.match(requestedUrl, /flowCode=M/);
assert.match(requestedUrl, /cmdCode=84/);

const opportunity = buildTradeOpportunity({
  currentImports: { data: [record({ period: '2025', primaryValue: 1200000, cifvalue: 1200000 })] },
  previousImports: { data: [record({ period: '2024', primaryValue: 1000000, cifvalue: 1000000 })] },
  currentOriginExports: { data: [record({ period: '2025', reporterCode: 156, reporterISO: 'CHN', reporterDesc: 'China', flowCode: 'X', partnerCode: 724, partnerISO: 'ESP', partnerDesc: 'Spain', primaryValue: 300000, fobvalue: 300000, cifvalue: null })] },
  previousOriginExports: { data: [record({ period: '2024', reporterCode: 156, reporterISO: 'CHN', reporterDesc: 'China', flowCode: 'X', partnerCode: 724, partnerISO: 'ESP', partnerDesc: 'Spain', primaryValue: 200000, fobvalue: 200000, cifvalue: null })] },
  originMarket: 'CN',
  targetMarket: 'ES',
  productCode: '84',
  observedAt: '2026-09-02T00:00:00.000Z',
});

assert.equal(opportunity.originMarket, 'CN');
assert.equal(opportunity.targetMarket, 'ES');
assert.equal(opportunity.signals.growth > 50, true);
assert.equal(opportunity.signals.availability, 100);
assert.equal(opportunity.commercial.importValueUSD, 1200000);
assert.equal(opportunity.legal.status, 'allowed');

console.log('NEWBASE UN Comtrade connector tests: PASS');
