const ADMIN_PATH = '/admin';
const REALM = 'OPVILO Admin';

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`, 'Cache-Control': 'no-store' },
  });
}

function forbidden() {
  return new Response('Admin authentication is not configured.', {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function decodeBasic(value) {
  if (!value || !value.startsWith('Basic ')) return null;
  try {
    const decoded = atob(value.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!(url.pathname === ADMIN_PATH || url.pathname.startsWith(`${ADMIN_PATH}/`))) {
    return context.next();
  }

  const expectedPassword = context.env.ADMIN_PASSWORD;
  if (!expectedPassword) return forbidden();

  const credentials = decodeBasic(context.request.headers.get('Authorization'));
  if (!credentials) return unauthorized();

  const expectedUser = context.env.ADMIN_USER || 'admin';
  const passwordDigest = await sha256(credentials.password);
  const expectedDigest = await sha256(expectedPassword);
  const valid = constantTimeEqual(credentials.user, expectedUser) && constantTimeEqual(passwordDigest, expectedDigest);

  if (!valid) return unauthorized();

  return context.next();
}
