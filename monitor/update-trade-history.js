import fs from 'node:fs';

const latestPath = 'data/latest-trade-run.json';
const historyPath = 'data/trade-history.json';
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
let history = [];
if (fs.existsSync(historyPath)) {
  try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch { history = []; }
}
if (!Array.isArray(history)) history = [];

const items = [
  ...(latest.accepted ?? []).map(x => ({ ...x, state: 'accepted' })),
  ...(latest.rejected ?? []).map(x => ({ ...x, state: 'rejected' })),
];

const previous = history[0]?.opportunities ?? [];
const previousById = new Map(previous.map(x => [x.opportunityId, x]));
const movements = [];

for (const item of items) {
  const id = item.opportunityId ?? item.opportunity?.id;
  if (!id) continue;
  const score = Number(item.score ?? 0);
  const old = previousById.get(id);
  let type = 'actualitzada';
  if (!old) type = 'nova';
  else if (Number(old.score ?? 0) !== score || old.state !== item.state) type = 'canvi';
  movements.push({
    type,
    opportunityId: id,
    state: item.state,
    reason: item.reason ?? null,
    score,
    level: item.level ?? 'none',
    productOrService: item.opportunity?.productOrService ?? id,
    originMarket: item.opportunity?.originMarket ?? null,
    targetMarket: item.opportunity?.targetMarket ?? null,
  });
}

const entry = {
  observedAt: latest.observedAt ?? new Date().toISOString(),
  source: latest.source ?? 'NEWBASE',
  inputCount: latest.inputCount ?? 0,
  acceptedCount: (latest.accepted ?? []).length,
  rejectedCount: (latest.rejected ?? []).length,
  movements,
  opportunities: items.map(item => ({
    opportunityId: item.opportunityId ?? item.opportunity?.id,
    state: item.state,
    score: Number(item.score ?? 0),
    level: item.level ?? 'none',
  })),
};

history.unshift(entry);
const output = history.slice(0, 30);
fs.writeFileSync(historyPath, `${JSON.stringify(output, null, 2)}\n`);
