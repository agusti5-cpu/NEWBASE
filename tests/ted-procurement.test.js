import { strict as assert } from 'node:assert';
import { searchTedProcurement } from '../connectors/ted-procurement.js';
import { validateCommercialEvidence } from '../engine/commercial-validation.js';
import { enrichTradeOpportunities } from '../engine/commercial-evidence-enricher.js';

const calls = [];
const fetchImpl = async (url, options = {}) => {
  const u = new URL(url);
  calls.push({ url: u, options });

  if (u.hostname === 'api.ted.europa.eu') {
    return {
      ok: true,
      json: async () => ({
        notices: [{
          'publication-number': '123456-2026',
          'notice-title': { eng: ['Lithium-ion battery supply'] },
          'buyer-name': { eng: ['Spanish Public Buyer'] },
          'buyer-country': 'ESP',
          'publication-date': '2026-08-20',
          'classification-cpv': ['31400000'],
          'total-value': '500000',
          'total-value-cur': 'EUR',
          'notice-type': 'cn-standard',
          links: { eng: { html: 'https://ted.europa.eu/en/notice/-/detail/123456-2026' } },
        }],
      }),
    };
  }

  if (u.hostname === 'servicios.ine.es') {
    return { ok: true, json: async () => [{ Nombre: 'Índice general. España', Data: [{ Fecha: 20260101, Valor: 101 }] }] };
  }

  if (u.hostname === 'ec.europa.eu') {
    return { ok: true, json: async () => ({ value: { '0': 103.2 } }) };
  }

  throw new Error('UNEXPECTED_REQUEST');
};

const ted = await searchTedProcurement({
  productOrService: 'Lithium-ion accumulators',
  targetMarket: 'ES',
  observedAt: '2026-09-03T10:00:00.000Z',
  fetchImpl,
});

assert.equal(ted.matches.length, 1);
assert.equal(ted.matches[0].publicationNumber, '123456-2026');
assert.equal(ted.matches[0].country, 'ESP');
assert.match(ted.query, /buyer-country=ESP/);
assert.match(ted.query, /FT~/);

const opportunity = {
  id: 'comtrade-CN-ES-850760-2024',
  productOrService: 'Lithium-ion accumulators',
  targetMarket: 'ES',
  observedAt: '2026-09-03T10:00:00.000Z',
  source: { name: 'United Nations UN Comtrade' },
  evidence: {
    sourceName: 'United Nations UN Comtrade',
    sourceUrl: 'https://comtradeapi.un.org/public/v1/preview/C/A/HS',
    observedAt: '2026-09-03T10:00:00.000Z',
    summary: 'Product-level UN Comtrade trade-flow evidence.',
  },
};

const enriched = await enrichTradeOpportunities([opportunity], { observedAt: opportunity.observedAt, fetchImpl });
const commercial = enriched.opportunities[0].commercialValidation.evidence;

assert.equal(commercial.some((item) => item.type === 'demand' && item.evidenceLevel === 'product'), true);
assert.equal(commercial.some((item) => item.type === 'economics' && item.evidenceLevel === 'product'), true);
assert.equal(validateCommercialEvidence(enriched.opportunities[0]).valid, true);
assert.equal(calls.some((call) => call.url.hostname === 'api.ted.europa.eu' && call.options.method === 'POST'), true);

console.log('NEWBASE TED commercial evidence tests: PASS');
