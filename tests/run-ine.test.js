import test from 'node:test';
import assert from 'node:assert/strict';
import { runIneDetector } from '../monitor/run-ine.js';

const payload = [
  {
    Nombre: 'Índice general de comercio minorista',
    Data: [
      { Fecha: '2026M06', Valor: 100 },
      { Fecha: '2026M07', Valor: 104 },
    ],
  },
];

test('INE detector runs connector output through the canonical NEWBASE pipeline', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => payload,
  });

  try {
    const result = await runIneDetector({ observedAt: '2026-09-02T00:00:00.000Z' });

    assert.equal(result.source, 'es-ine-retail-75808');
    assert.equal(result.inputCount, 1);
    assert.equal(result.normalizedCount, 1);
    assert.equal(result.accepted.length + result.rejected.length, 1);

    // INE supplies demand/growth observations but not product-level market-gap,
    // availability or commercial evidence. The conservative pipeline must
    // therefore keep this observation out of the actionable accepted set.
    assert.equal(result.accepted.length, 0);
    assert.equal(result.rejected.length, 1);
    assert.equal(result.rejected[0].reason, 'SCORE_BELOW_THRESHOLD');
    assert.equal(result.rejected[0].score, 45);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
