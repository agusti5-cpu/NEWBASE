import { normalizeOpportunity } from './normalize.js';

export function scoreOpportunity(input) {
  const item = normalizeOpportunity(input);
  let score = 0;

  if (item.legal) score += 40;
  if (item.authorizedAccess) score += 30;
  if (item.url) score += 10;
  if (item.title) score += 10;
  if (item.source) score += 10;

  return { ...item, score };
}
