import assert from 'node:assert/strict';
import test from 'node:test';
import { runAllConnectors } from '../connectors/connector-orchestrator.js';

test('orchestrator inventories every configured source without network access', async () => {
  const result = await runAllConnectors({ dryRun: true });
  assert.equal(result.total, result.results.length);
  assert.equal(result.errors, 0);
  assert.ok(result.total > 0);
  assert.ok(result.configurationRequired > 0);
});

test('one connector failure does not abort the whole run', async () => {
  const result = await runAllConnectors({
    methods: { 'es-datos-gob': '__missing_method__' },
  });
  assert.equal(result.status, 'partial');
  assert.ok(result.results.some((item) => item.id === 'es-datos-gob' && item.status === 'error'));
});
