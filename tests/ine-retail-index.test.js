import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchRetailIndex, toOpportunityCandidates } from '../connectors/ine-retail-index.js';

const fixture = [
  {
    Nombre: 'Índice general. Cataluña',
    Data: [
      { Fecha: 20260101, Valor: 100 },
      { Fecha: 20260201, Valor: 104 },
    ],
  },
  {
    Nombre: 'Variación mensual. Cataluña',
    Data: [
      { Fecha: 20260101, Valor: 1 },
      { Fecha: 20260201, Valor: 2 },
    ],
  },
];

test('INE connector fetches official JSON with bounded parameters', async () => {
  let requestedUrl;
  const payload = [{ Nombre: 'Índice general. España', Data: [{ Fecha: 20260201, Valor: 103 }] }];

  const result = await fetchRetailIndex({
    nult: 50,
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return { ok: true, json: async () => payload };
    },
  });

  assert.equal(new URL(requestedUrl).searchParams.get('nult'), '24');
  assert.equal(new URL(requestedUrl).searchParams.get('tip'), 'AM');
  assert.deepEqual(result, payload);
});

test('INE connector creates candidates only from index series', () => {
  const candidates = toOpportunityCandidates(fixture, { observedAt: '2026-09-02T00:00:00.000Z' });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].originMarket, 'ES');
  assert.equal(candidates[0].targetMarket, 'ES');
  assert.equal(candidates[0].source.name, 'Instituto Nacional de Estadística (INE)');
  assert.equal(candidates[0].legal.status, 'allowed');
  assert.equal(candidates[0].signals.marketGap, 0);
  assert.equal(candidates[0].signals.availability, 0);
  assert.ok(candidates[0].signals.growth > 50);
  assert.equal(candidates[0].confidence, 0.9);
});

test('INE connector does not invent price or supply data', () => {
  const [candidate] = toOpportunityCandidates(fixture);

  assert.equal(candidate.commercial.price, null);
  assert.equal(candidate.commercial.currency, '');
  assert.equal(candidate.commercial.knownCosts, null);
  assert.equal(candidate.signals.availability, 0);
});
