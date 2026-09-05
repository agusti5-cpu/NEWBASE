import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../web/functions/_middleware.js';

function context(pathname, authorization, env = { ADMIN_PASSWORD: 'test-password', ADMIN_USER: 'admin' }) {
  return {
    request: new Request(`https://opvilo.com${pathname}`, authorization ? { headers: { Authorization: authorization } } : undefined),
    env,
    next: async () => new Response('next', { status: 200 }),
  };
}

const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

test('public routes pass through without authentication', async () => {
  const response = await onRequest(context('/ia'));
  assert.equal(response.status, 200);
});

test('admin requires authentication', async () => {
  const response = await onRequest(context('/admin'));
  assert.equal(response.status, 401);
  assert.match(response.headers.get('WWW-Authenticate') ?? '', /Basic/);
});

test('admin rejects invalid credentials', async () => {
  const response = await onRequest(context('/admin/', basic('admin', 'wrong')));
  assert.equal(response.status, 401);
});

test('admin accepts valid credentials', async () => {
  const response = await onRequest(context('/admin/', basic('admin', 'test-password')));
  assert.equal(response.status, 200);
});

test('admin fails closed when the secret is missing', async () => {
  const response = await onRequest(context('/admin', basic('admin', 'anything'), {}));
  assert.equal(response.status, 503);
});
