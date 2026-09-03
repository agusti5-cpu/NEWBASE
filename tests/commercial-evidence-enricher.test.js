import test from 'node:test';
import assert from 'node:assert/strict';
import { collectCommercialContext, enrichTradeOpportunities } from '../engine/commercial-evidence-enricher.js';

const inePayload = [
  {
    Nombre: 'Índice general. España',
    Data: [{ Fecha: 20260101, Valor: 101 }, { Fecha: 20260201, Valor: 102 }]
  }
];

const eurostatPayload = {
  id: ['geo', 'coicop', 'unit', 'time'],
  size: [1, 1, 1, 1],
  value: { '0': 103.2 }
};

function mockFetch(url) {
  const text = String(url);
  if (text.includes('servicios.ine.es')) return Promise.resolve({ ok: true, json: async () => inePayload });
  if (text.includes('ec.europa.eu/eurostat')) return Promise.resolve({ ok: true, json: async () => eurostatPayload });
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

test('commercial context collects independent official context without inventing product proof', async () => {
  const result = await collectCommercialContext({ targetMarket: 'ES', observedAt: '2026-09-03T09:00:00Z', fetchImpl: mockFetch });

  assert.equal(result.errors.length, 0);
  assert.equal(result.evidence.length, 2);
  assert.deepEqual(result.evidence.map((item) => item.type), ['demand_context', 'economics_context']);
  assert.equal(result.evidence[0].sourceName, 'Instituto Nacional de Estadística (INE)');
  assert.equal(result.evidence[1].sourceName, 'Eurostat');
});

test('enrichment preserves existing evidence and adds context', async () => {
  const opportunity = {
    id: 'opp-1',
    targetMarket: 'ES',
    observedAt: '2026-09-03T09:00:00Z',
    commercialValidation: {
      evidence: [{
        type: 'trade_flow',
        sourceName: 'United Nations UN Comtrade',
        sourceUrl: 'https://comtradeapi.un.org/public/v1/preview/C/A/HS',
        observedAt: '2026-09-03T09:00:00Z'
      }]
    }
  };

  const result = await enrichTradeOpportunities([opportunity], { fetchImpl: mockFetch });
  assert.equal(result.opportunities.length, 1);
  assert.equal(result.opportunities[0].commercialValidation.evidence.length, 3);
  assert.equal(result.diagnostics[0].errors.length, 0);
});

test('context collection fails closed when official sources fail', async () => {
  const result = await collectCommercialContext({ targetMarket: 'ES', fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(result.evidence.length, 0);
  assert.equal(result.errors.length, 2);
});
