import test from 'node:test';
import assert from 'node:assert/strict';
import { getConnector, listConnectors, runConnector } from '../connectors/connector-hub.js';

test('connector hub exposes every configured source with an explicit status', () => {
  const sources = listConnectors();
  assert.equal(sources.length, 6);
  assert.ok(sources.every((source) => source.status === 'ready'));
  assert.equal(sources.find((source) => source.id === 'jp-estat-dashboard')?.region, 'ASIA');
});

test('connector hub blocks unknown sources', () => {
  assert.deepEqual(getConnector('does-not-exist'), {
    status: 'unavailable',
    reason: 'UNKNOWN_SOURCE'
  });
});

test('connector hub rejects unknown connector methods before execution', async () => {
  const result = await runConnector('es-ine-retail-75808', 'doesNotExist');
  assert.equal(result.status, 'error');
  assert.equal(result.reason, 'CONNECTOR_METHOD_NOT_FOUND');
});

test('connector hub reports missing connector methods without network access', async () => {
  const result = await runConnector('eu-data-europa', 'fetch');
  assert.equal(result.status, 'error');
  assert.equal(result.reason, 'CONNECTOR_METHOD_NOT_FOUND');
});
