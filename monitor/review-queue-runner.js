import fs from 'node:fs/promises';
import { enqueueRejected, getDue, markRechecked } from '../engine/review-queue.js';

const QUEUE_PATH = new URL('../data/review-queue.json', import.meta.url);
const INPUTS = [
  new URL('../data/latest-ine-run.json', import.meta.url),
  new URL('../data/latest-trade-run.json', import.meta.url),
];

async function readJson(url, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(url, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(url, value) {
  await fs.writeFile(url, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function runReviewQueue({ now = new Date().toISOString() } = {}) {
  let queue = await readJson(QUEUE_PATH, []);
  if (!Array.isArray(queue)) queue = [];

  // New retryable rejections become durable queue entries.
  for (const input of INPUTS) {
    const result = await readJson(input, null);
    for (const rejection of result?.rejected ?? []) {
      queue = enqueueRejected(queue, rejection);
    }
  }

  // Fresh detector outputs are the evidence used for automatic re-checks.
  // An accepted result resolves the queued item; a still-rejected result
  // advances its retry window. Missing evidence leaves the item untouched.
  const due = getDue(queue, now);
  const freshResults = (await Promise.all(INPUTS.map((input) => readJson(input, null))))
    .flatMap((result) => [...(result?.accepted ?? []), ...(result?.rejected ?? [])]);

  for (const item of due) {
    const fresh = freshResults.find((result) =>
      (result?.opportunity?.id ?? result?.opportunityId) === item.opportunityId
    );
    if (fresh) {
      queue = markRechecked(queue, item.opportunityId, now, fresh);
    }
  }

  await writeJson(QUEUE_PATH, queue);
  return { now, dueCount: due.length, queueCount: queue.length, queue };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runReviewQueue();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
