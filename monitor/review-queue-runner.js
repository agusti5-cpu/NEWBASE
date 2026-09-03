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

function reviewableResults(result) {
  const output = [];
  output.push(...(result?.rejected ?? []));

  // Publication failures are distinct from evaluation failures. Keep the
  // complete candidate so a later detector run can retry the publication gate.
  for (const item of result?.notPublishable ?? []) {
    if (item?.opportunity && item.reason) {
      output.push({
        status: 'rejected',
        reason: item.reason,
        opportunity: item.opportunity,
        opportunityId: item.opportunityId ?? item.opportunity.id,
      });
    }
  }
  return output;
}

export async function runReviewQueue({ now = new Date().toISOString() } = {}) {
  let queue = await readJson(QUEUE_PATH, []);
  if (!Array.isArray(queue)) queue = [];

  for (const input of INPUTS) {
    const result = await readJson(input, null);
    for (const rejection of reviewableResults(result)) {
      queue = enqueueRejected(queue, rejection);
    }
  }

  const due = getDue(queue, now);
  const freshResults = (await Promise.all(INPUTS.map((input) => readJson(input, null))))
    .flatMap((result) => [
      ...(result?.accepted ?? []),
      ...(result?.rejected ?? []),
      ...(result?.publishable ?? []),
      ...((result?.notPublishable ?? []).map((item) => ({
        status: 'rejected',
        reason: item.reason,
        opportunityId: item.opportunityId ?? item.opportunity?.id,
        opportunity: item.opportunity ?? null,
      }))),
    ]);

  for (const item of due) {
    const fresh = freshResults.find((result) =>
      (result?.opportunity?.id ?? result?.opportunityId) === item.opportunityId
    );
    if (fresh) {
      // Only a truly publishable result resolves a publication-review item.
      // An evaluation 'accepted' result can still fail the publication gate.
      const outcome = fresh.status === 'publishable' ? fresh : {
        status: 'rejected',
        reason: fresh.reason ?? item.reason,
        opportunity: fresh.opportunity ?? item.candidate,
      };
      queue = markRechecked(queue, item.opportunityId, now, outcome);
    }
  }

  await writeJson(QUEUE_PATH, queue);
  return { now, dueCount: due.length, queueCount: queue.length, queue };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runReviewQueue();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
