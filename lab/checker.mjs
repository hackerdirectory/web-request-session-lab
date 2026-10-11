import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export async function verifyLab(base) {
  let cookie = '';
  let checks = 0;
  const check = (actual, expected) => {assert.deepEqual(actual, expected); checks++;};
  async function call(path, {method = 'GET', body, raw, cookieOverride, headers = {}} = {}) {
    const response = await fetch(`${base}${path}`, {method, headers: {...(cookieOverride || cookie ? {Cookie: cookieOverride ?? cookie} : {}), ...(body !== undefined || raw !== undefined ? {'Content-Type': 'application/json'} : {}), ...headers}, ...(body !== undefined ? {body: JSON.stringify(body)} : raw !== undefined ? {body: raw} : {})});
    const text = await response.text();
    const data = response.headers.get('Content-Type')?.includes('application/json') ? JSON.parse(text) : null;
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    if (data) {
      check(data.requestId, response.headers.get('X-Request-ID'));
      check(text.includes('hd_web_lab_session='), false);
    }
    check(response.headers.get('Cache-Control'), 'no-store');
    return {status: response.status, data, text, setCookie, headers: response.headers};
  }
  const post = (path, body = {}, rest = {}) => call(path, {method: 'POST', body, ...rest});
  check((await post('/api/reset')).status, 200);
  const home = await call('/'); check(home.status, 200); check(home.text.includes('lang="tr"'), true);
  check((await call('/no-such-page')).status, 404);
  const wrongMethod = await call('/api/login'); check(wrongMethod.status, 405); check(wrongMethod.headers.get('Allow'), 'POST');
  check((await post('/api/login', {identity: 'alice'}, {headers: {Origin: 'https://example.invalid'}})).status, 403);
  check((await post('/api/login', {identity: 'alice'}, {headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
  check((await call('/api/login', {method: 'POST', raw: '{'})).status, 400);
  check((await post('/api/login', {identity: 'alice'}, {headers: {'Content-Type': 'text/plain'}})).status, 415);
  check((await post('/api/login', {identity: ['alice']})).status, 400);
  check((await post('/api/login', {identity: 'alice', excess: 'x'.repeat(5000)})).status, 413);
  check((await post('/api/login', {identity: 'unknown'})).status, 400);
  check((await post('/api/login', {identity: 'alice', role: 'reviewer'})).status, 400);
  const found = await call('/api/book?case=found'); check(found.status, 200); check(found.data.book.title, 'Atlas Notları'); check(found.data.trace.status, 200); check(found.data.trace.requestId, found.data.requestId);
  const missing = await call('/api/book?case=missing'); check(missing.status, 404); check(missing.data.error, 'book-not-found'); check(Object.hasOwn(missing.data, 'book'), false);
  check((await call('/api/book?case=found&case=missing')).status, 400);
  check((await call('/api/book?case=unlisted')).status, 400);
  const anonymous = await post('/api/session/start'); check(anonymous.status, 201); check(anonymous.data.session.authenticated, false);
  check(anonymous.setCookie.includes('HttpOnly; SameSite=Strict; Path=/; Max-Age=900'), true);
  const oldCookie = cookie;
  const unauthed = await call('/api/resource?case=own'); check(unauthed.status, 401); check(unauthed.headers.get('WWW-Authenticate'), 'LabSession realm="local-demo"');
  const login = await post('/api/login', {identity: 'alice'}); check(login.status, 200); check(login.data.session.authenticated, true); check(cookie === oldCookie, false);
  const activeCookie = cookie;
  check((await call('/api/resource?case=own', {cookieOverride: oldCookie})).status, 401);
  const own = await call('/api/resource?case=own'); check(own.status, 200); check(own.data.decision.actor, 'alice'); check(own.data.decision.objectTenant, 'Atlas'); check(own.data.resource.id, 'report-atlas-01');
  for (const [name, reason] of [['other-owner', 'owner-mismatch'], ['other-tenant', 'tenant-mismatch'], ['write-own', 'role-permission-missing']]) {
    const denied = await call(`/api/resource?case=${name}`); check(denied.status, 403); check(denied.data.decision.reason, reason); check(Object.hasOwn(denied.data, 'resource'), false);
  }
  const state = await call('/api/state'); check(state.data.activeSessions.length, 1); check(state.data.ledger.some(item => item.type === 'rotated'), true);
  check(state.text.includes(activeCookie.split('=')[1]), false); check(state.text.includes(oldCookie.split('=')[1]), false);
  check((await post('/api/clock', {seconds: 0})).status, 400);
  check((await post('/api/clock', {seconds: 1.5})).status, 400);
  check((await post('/api/clock', {seconds: 301})).status, 200);
  check((await call('/api/resource?case=own')).status, 401);
  const expired = await call('/api/state'); check(expired.data.activeSessions.length, 0); check(expired.data.ledger.some(item => item.type === 'expired'), true);
  await post('/api/login', {identity: 'bob'});
  const write = await call('/api/resource?case=write-own'); check(write.status, 200); check(write.data.decision.actor, 'bob'); check(write.data.observation.includes('no record was changed'), true);
  check((await call('/api/resource?case=other-owner')).status, 403); check((await call('/api/resource?case=other-tenant')).status, 403);
  const beforeLogout = cookie;
  const logout = await post('/api/logout'); check(logout.status, 200); check(logout.setCookie.includes('Max-Age=0'), true);
  check((await call('/api/resource?case=own', {cookieOverride: beforeLogout})).status, 401);
  const last = await call('/api/state'); check(last.data.activeSessions.length, 0); check(last.data.ledger.some(item => item.type === 'logout'), true);
  await post('/api/reset');
  const reset = await call('/api/state'); check(reset.data.activeSessions, []); check(reset.data.ledger, []); check(reset.data.traces, []); check(reset.data.clock, '2030-01-01T12:00:00.000Z');
  return {checks, status: 'pass', scope: 'actual-loopback-HTTP; no manual student or browser acceptance'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv[2] || 'http://127.0.0.1:4191';
  const url = new URL(base);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Only a loopback HTTP origin is supported');
  process.stdout.write(`${JSON.stringify(await verifyLab(url.origin), null, 2)}\n`);
}
