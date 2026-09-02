import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  enqueueRejected,
  getDue,
  markRechecked,
  isRetryableRejection,
} from '../engine/review-queue.js';

const candidate = {
  id: 'trade-cn-es-392690-2025',
  category: 'trade',
  productOrService: 'Articles of plastics, other',
  originMarket: 'CN',
  targetMarket: 'ES',
  observedAt: '2026-09-02T00:00:00.000Z',
};

test('queues retryable rejection with deterministic delay and deduplication', () => {
  const rejection = {
    status: 'rejected',
    reason: 'LEGAL_REVIEW_REQUIRED',
    opportunity: candidate,
  };

  assert.equal(isRetryableRejection(rejection), true);
  const first = enqueueRejected([], rejection);
  assert.equal(first.length, 1);
  assert.equal(first[0].attempts, 0);
  assert.equal(first[0].nextEligibleAt, '2026-09-03T00:00:00.000Z');

  const second = enqueueRejected(first, rejection);
  assert.equal(second.length, 1);
});

test('does not queue permanent or non-rejection outcomes', () => {
  const permanent = {
    status: 'rejected',
    reason: 'INVALID_OPPORTUNITY',
    opportunity: candidate,
  };
  const accepted = { status: 'accepted', opportunity: candidate };

  assert.equal(isRetryableRejection(permanent), false);
  assert.deepEqual(enqueueRejected([], permanent), []);
  assert.deepEqual(enqueueRejected([], accepted), []);
});

test('returns only due queue entries and removes accepted outcomes', () => {
  const rejection = {
    status: 'rejected',
    reason: 'LEGAL_REVIEW_REQUIRED',
    opportunity: candidate,
  };
  const queue = enqueueRejected([], rejection);

  assert.equal(getDue(queue, '2026-09-02T23:59:59.999Z').length, 0);
  assert.equal(getDue(queue, '2026-09-03T00:00:00.000Z').length, 1);

  const resolved = markRechecked(
    queue,
    candidate.id,
    '2026-09-03T00:00:00.000Z',
    { status: 'accepted' },
  );
  assert.deepEqual(resolved, []);
});

test('keeps rejected entry and advances retry window after recheck', () => {
  const rejection = {
    status: 'rejected',
    reason: 'LEGAL_REVIEW_REQUIRED',
    opportunity: candidate,
  };
  const queue = enqueueRejected([], rejection);
  const next = markRechecked(
    queue,
    candidate.id,
    '2026-09-03T00:00:00.000Z',
    { status: 'rejected', reason: 'LEGAL_REVIEW_REQUIRED' },
  );

  assert.equal(next.length, 1);
  assert.equal(next[0].attempts, 1);
  assert.equal(next[0].lastCheckedAt, '2026-09-03T00:00:00.000Z');
  assert.equal(next[0].nextEligibleAt, '2026-09-04T00:00:00.000Z');
});
