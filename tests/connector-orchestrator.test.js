import assert from 'node:assert/strict';
import test from 'node:test';
import { runAllConnectors } from '../connectors/connector-orchestrator.js';

test('orchestrator returns a result for every configured source', async () => {
  const result = await runAllConnectors({ defaultMethod: 'fetch' });
  assert.equal(result.total, result.results.length);
  assert.ok(result.total > 0);
  assert.ok(['success', 'partial'].includes(result.status));
});

test('one connector failure does not abort the whole run', async () => {
  const result = await runAllConnectors({
    methods: { 'es-datos-gob': '__missing_method__' },
    defaultMethod: 'fetch',
  });
  assert.equal(result.status, 'partial');
  assert.ok(result.results.some((item) => item.id === 'es-datos-gob' && item.status === 'error'));
});
