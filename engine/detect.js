import { scoreOpportunity } from './opportunity.js';

const SIGNALS = [
  ['price', 15],
  ['cost', 15],
  ['tender', 20],
  ['procurement', 20],
  ['grant', 20],
  ['export', 15],
  ['import', 15],
  ['market', 10],
  ['business', 10],
  ['startup', 10],
  ['innovation', 10]
];

/**
 * Converts an already-authorized source record into a scored opportunity signal.
 * It never scrapes or bypasses access controls and never treats a signal as a
 * confirmed business opportunity without later validation.
 */
export function detectOpportunity(input) {
  const scored = scoreOpportunity(input);
  const text = `${scored.title} ${scored.category}`.toLowerCase();

  let signalScore = 0;
  const signals = [];
  for (const [keyword, points] of SIGNALS) {
    if (text.includes(keyword)) {
      signalScore += points;
      signals.push(keyword);
    }
  }

  const totalScore = Math.min(100, scored.score + signalScore);
  const status = !scored.legal || !scored.authorizedAccess
    ? 'blocked'
    : totalScore >= 70
      ? 'candidate'
      : 'watch';

  return {
    ...scored,
    score: totalScore,
    status,
    signals,
    confirmed: false
  };
}
