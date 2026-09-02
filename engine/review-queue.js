/**
 * Persistent-free re-evaluation queue primitives.
 *
 * The queue is deliberately deterministic so a storage adapter (file, KV,
 * database, etc.) can persist it without changing decision logic.
 * Rejected candidates are only re-checked when their retry policy allows it.
 */

const RETRYABLE_REASONS = new Set([
  'legal-validation-required',
  'LEGAL_REVIEW_REQUIRED',
  'PUBLICATION_EVIDENCE_REQUIRED',
  'INSUFFICIENT_EVIDENCE',
]);

const DEFAULT_DELAY_HOURS = 24;

function addHours(iso, hours) {
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value)) throw new Error('INVALID_OBSERVED_AT');
  return new Date(value + hours * 60 * 60 * 1000).toISOString();
}

function retryable(result) {
  return Boolean(result?.status === 'rejected' && RETRYABLE_REASONS.has(result.reason));
}

export function enqueueRejected(queue, result, options = {}) {
  const current = Array.isArray(queue) ? queue : [];
  if (!retryable(result) || !result.opportunity?.id) return current;

  const opportunity = result.opportunity;
  const id = opportunity.id;
  const existing = current.find((item) => item.opportunityId === id);
  const observedAt = opportunity.observedAt;
  const delayHours = Number.isFinite(options.delayHours) ? options.delayHours : DEFAULT_DELAY_HOURS;

  const item = {
    opportunityId: id,
    reason: result.reason,
    candidate: opportunity,
    attempts: existing?.attempts ?? 0,
    firstQueuedAt: existing?.firstQueuedAt ?? observedAt,
    lastCheckedAt: existing?.lastCheckedAt ?? null,
    nextEligibleAt: addHours(existing?.lastCheckedAt ?? observedAt, delayHours),
  };

  if (!existing) return [...current, item];
  return current.map((entry) => (entry.opportunityId === id ? item : entry));
}

export function getDue(queue, now = new Date().toISOString()) {
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs) || !Array.isArray(queue)) return [];
  return queue.filter((item) => {
    const next = new Date(item.nextEligibleAt).getTime();
    return Number.isFinite(next) && next <= nowMs;
  });
}

export function markRechecked(queue, opportunityId, checkedAt, outcome, options = {}) {
  if (!Array.isArray(queue)) return [];
  const delayHours = Number.isFinite(options.delayHours) ? options.delayHours : DEFAULT_DELAY_HOURS;
  const next = Array.isArray(outcome) ? outcome[0] : outcome;

  return queue.flatMap((item) => {
    if (item.opportunityId !== opportunityId) return [item];
    if (next?.status === 'accepted') return [];

    return [{
      ...item,
      reason: next?.reason ?? item.reason,
      attempts: item.attempts + 1,
      lastCheckedAt: checkedAt,
      nextEligibleAt: addHours(checkedAt, delayHours),
    }];
  });
}

export function isRetryableRejection(result) {
  return retryable(result);
}

export const REVIEW_QUEUE_DEFAULT_DELAY_HOURS = DEFAULT_DELAY_HOURS;
