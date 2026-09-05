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

  // 2025 is intentionally unavailable: the connector must automatically
  // fall back to the latest consecutive period pair with complete data.
  if (period === 2025) return { ok: true, json: async () => ({ count: 0, error: '', data: [] }) };
  if (flow === 'M' && period === 2024) return { ok: true, json: async () => payload(1200000, 2024) };
  if (flow === 'M' && period === 2023) return { ok: true, json: async () => payload(900000, 2023) };
  if (flow === 'X' && period === 2024) return { ok: true, json: async () => payload(300000, 2024, 'X', reporter, partner) };
  if (flow === 'X' && period === 2023) return { ok: true, json: async () => payload(250000, 2023, 'X', reporter, partner) };

  // Automatic commercial-context enrichment uses official INE and Eurostat
  // endpoints. Return valid macro context, while deliberately not creating
  // product-level commercial evidence that the source does not provide.
  if (u.hostname === 'servicios.ine.es') {
    return {
      ok: true,
      json: async () => [{
        Nombre: 'Índice general. España',
        Data: [{ Fecha: 20260101, Valor: 101 }, { Fecha: 20260201, Valor: 102 }],
      }],
    };
  }
  if (u.hostname === 'ec.europa.eu' && u.pathname.includes('/eurostat/')) {
    return {
      ok: true,
      json: async () => ({ id: ['geo', 'coicop', 'unit', 'time'], size: [1, 1, 1, 1], value: { '0': 103.2 } }),
    };
  }

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
  options: { periodLookback: 2 },
});

assert.equal(result.source, 'un-comtrade-preview');
console.error('DEBUG RUN-TRADE', JSON.stringify({ inputCount: result.inputCount, normalizedCount: result.normalizedCount, accepted: result.accepted.length, rejected: result.rejected.length, errors: result.errors, calls: calls.map((url) => String(url)) }, null, 2));
assert.equal(result.inputCount, 1);
assert.equal(result.normalizedCount, 1);

// The detector performs additional official INE/Eurostat enrichment. Keep
// this assertion scoped to the eight UN Comtrade requests used by fallback.
const tradeCalls = calls.filter((url) => url.pathname === '/public/v1/preview/C/A/HS');
assert.equal(tradeCalls.length, 8);
assert.equal(tradeCalls[4].searchParams.get('period'), '2024');
assert.equal(tradeCalls[5].searchParams.get('period'), '2023');

// Trade detection succeeds, but macro context is explicitly not product-level
// demand/economics proof, so the publication gate must remain closed.
assert.equal(result.accepted.length, 1);
assert.equal(result.rejected.length, 0);
assert.equal(result.accepted[0].opportunity.originMarket, 'CN');
assert.equal(result.accepted[0].opportunity.targetMarket, 'ES');
assert.equal(result.accepted[0].opportunity.id, 'comtrade-CN-ES-392690-2024');
assert.equal(result.accepted[0].opportunity.signals.growth > 50, true);
assert.equal(result.accepted[0].opportunity.legal.status, 'unknown');
assert.equal(result.accepted[0].opportunity.evidence.sourceName, 'United Nations UN Comtrade');
assert.equal(result.publishable.length, 0);
assert.equal(result.notPublishable.length, 1);
assert.equal(result.notPublishable[0].reason, 'COMMERCIAL_VALIDATION_REQUIRED');

console.log('NEWBASE trade detector tests: PASS');
