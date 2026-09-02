import { strict as assert } from 'node:assert';
import { runTradeDetector } from '../monitor/run-trade.js';

function payload(value, period, flowCode = 'M', reporterCode = 724, partnerCode = 0) {
  return {
    count: 1,
    error: '',
    data: [{
      period: String(period),
      reporterCode,
      reporterISO: reporterCode === 156 ? 'CHN' : 'ESP',
      reporterDesc: reporterCode === 156 ? 'China' : 'Spain',
      flowCode,
      partnerCode,
      partnerISO: partnerCode === 724 ? 'ESP' : 'W00',
      partnerDesc: partnerCode === 724 ? 'Spain' : 'World',
      cmdCode: '392690',
      cmdDesc: 'Articles of plastics, other',
      primaryValue: value,
      cifvalue: flowCode === 'M' ? value : null,
      fobvalue: flowCode === 'X' ? value : null,
      netWgt: 1000,
      isReported: true,
      isAggregate: false,
    }],
  };
}

const calls = [];
const fetchImpl = async (url) => {
  const u = new URL(url);
  calls.push(u);
  const period = Number(u.searchParams.get('period'));
  const flow = u.searchParams.get('flowCode');
  const reporter = Number(u.searchParams.get('reportercode'));
  const partner = Number(u.searchParams.get('partnerCode'));

  if (flow === 'M' && period === 2025) return { ok: true, json: async () => payload(1200000, 2025) };
  if (flow === 'M' && period === 2024) return { ok: true, json: async () => payload(900000, 2024) };
  if (flow === 'X' && period === 2025) return { ok: true, json: async () => payload(300000, 2025, 'X', reporter, partner) };
  if (flow === 'X' && period === 2024) return { ok: true, json: async () => payload(250000, 2024, 'X', reporter, partner) };
  throw new Error('UNEXPECTED_REQUEST');
};

const result = await runTradeDetector({
  routes: [{
    originMarket: 'CN',
    originReporterCode: 156,
    targetMarket: 'ES',
    targetReporterCode: 724,
    products: [{ code: '392690', name: 'Articles of plastics, other' }],
  }],
  currentPeriod: 2025,
  previousPeriod: 2024,
  observedAt: '2026-09-02T00:00:00.000Z',
  fetchImpl,
});

assert.equal(result.source, 'un-comtrade-preview');
assert.equal(result.inputCount, 1);
assert.equal(result.normalizedCount, 1);
assert.equal(calls.length, 4);
assert.equal(result.accepted.length + result.rejected.length, 1);
assert.equal(result.rejected.length, 0);
assert.equal(result.accepted[0].originMarket, 'CN');
assert.equal(result.accepted[0].targetMarket, 'ES');
assert.equal(result.accepted[0].signals.growth > 50, true);

console.log('NEWBASE trade detector tests: PASS');
