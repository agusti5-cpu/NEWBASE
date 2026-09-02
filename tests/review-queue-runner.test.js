import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { enqueueRejected, getDue, markRechecked } from '../engine/review-queue.js';

test('review queue lifecycle resolves when fresh evidence becomes accepted', () => {
  const opportunity = {
    id: 'trade-cn-es-392690-2025',
    category: 'trade',
    productOrService: 'Articles of plastics, other',
    originMarket: 'CN',
    targetMarket: 'ES',
    observedAt: '2026-09-02T00:00:00.000Z',
  };
  const rejected = {
    status: 'rejected',
    reason: 'LEGAL_REVIEW_REQUIRED',
    opportunity,
  };

  const queued = enqueueRejected([], rejected);
  assert.equal(queued.length, 1);

  const due = getDue(queued, '2026-09-03T00:00:00.000Z');
  assert.equal(due.length, 1);

  const resolved = markRechecked(
    queued,
    opportunity.id,
    '2026-09-03T00:00:00.000Z',
    { status: 'accepted', opportunity },
  );
  assert.deepEqual(resolved, []);
});

test('review queue never rechecks a permanent rejection', () => {
  const opportunity = {
    id: 'invalid-1',
    category: 'trade',
    productOrService: 'x',
    originMarket: 'CN',
    targetMarket: 'ES',
    observedAt: '2026-09-02T00:00:00.000Z',
  };
  assert.deepEqual(
    enqueueRejected([], { status: 'rejected', reason: 'INVALID_OPPORTUNITY', opportunity }),
    [],
  );
});
