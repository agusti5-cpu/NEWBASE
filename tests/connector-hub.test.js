import test from 'node:test';
import assert from 'node:assert/strict';
import { getConnector, listConnectors, runConnector } from '../connectors/connector-hub.js';

test('connector hub exposes registered and unregistered sources without guessing', () => {
  const sources = listConnectors();
  const ine = sources.find((source) => source.id === 'es-ine-retail-75808');
  const eu = sources.find((source) => source.id === 'eu-data-europa');

  assert.equal(ine?.status, 'ready');
  assert.equal(eu?.status, 'unavailable');
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

test('connector hub never turns a missing connector into an executable source', async () => {
  const result = await runConnector('eu-data-europa', 'fetch');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'CONNECTOR_NOT_IMPLEMENTED');
});
