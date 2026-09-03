import { fetchDataset } from '../connectors/eurostat.js';
import { fetchIndicatorInfo, fetchData } from '../connectors/japan-estat-dashboard.js';

const results = [];

async function check(name, fn) {
  try {
    const value = await fn();
    results.push({ name, ok: true, summary: summarize(value) });
  } catch (error) {
    results.push({ name, ok: false, error: String(error?.message || error) });
  }
}

function summarize(value) {
  if (value === null || value === undefined) return 'empty';
  if (Array.isArray(value)) return `array:${value.length}`;
  if (typeof value === 'object') return `object:${Object.keys(value).length}keys`;
  return typeof value;
}

await check('eurostat', () => fetchDataset({
  datasetCode: 'prc_hicp_midx',
  lang: 'en',
  lastTimePeriod: 1,
  filters: { geo: 'ES' },
}));

await check('japan-indicator-discovery', () => fetchIndicatorInfo({
  lang: 'EN',
  category: 'economy',
}));

// Official e-Stat Dashboard API documentation provides this public sample
// indicator. Keeping the test deterministic avoids requiring secrets or
// manually supplied environment variables in CI.
const JAPAN_SAMPLE_INDICATOR = '0201010010000020010';

await check('japan-data', () => fetchData({
  indicator: JAPAN_SAMPLE_INDICATOR,
  lang: 'EN',
  time: '2017CY00',
  region: '00000',
}));

for (const result of results) console.log(JSON.stringify(result));
if (results.some((result) => !result.ok)) process.exitCode = 1;
