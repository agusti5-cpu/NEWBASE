import fs from 'node:fs/promises';

const INPUT_PATH = new URL('../data/latest-trade-run.json', import.meta.url);
const OUTPUT_PATH = new URL('../data/opvilo-feed.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await fs.readFile(url, 'utf8'));
}

export async function writeOpviloOutput({ now } = {}) {
  const result = await readJson(INPUT_PATH);
  const generatedAt = now || result.generatedAt || result.observedAt || new Date().toISOString();
  const opportunities = Array.isArray(result.publishable) ? result.publishable : [];

  const output = {
    schema: 'opvilo-feed/v1',
    generatedAt,
    source: 'NEWBASE',
    status: result.status || 'unknown',
    count: opportunities.length,
    opportunities,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await writeOpviloOutput();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
