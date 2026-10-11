import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {evaluatePolicy, validatePolicy} from './policy.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures.json', import.meta.url), 'utf8'));
const defaultPolicy = JSON.parse(await readFile(new URL('./policy.json', import.meta.url), 'utf8'));
const COOKIE = 'hd_web_lab_session';
const TTL = 300;
const BASE_TIME = Date.parse('2030-01-01T12:00:00Z');
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/lab.css', ['lab.css', 'text/css; charset=utf-8']],
  ['/lab.js', ['lab.js', 'text/javascript; charset=utf-8']]
]);

export function createLabServer({policy = defaultPolicy} = {}) {
  const validatedPolicy = validatePolicy(policy);
  let offset = 0;
  let generation = 0;
  let requestCounter = 0;
  const sessions = new Map();
  const history = [];
  const traces = [];
  const now = () => BASE_TIME + offset * 1000;
  const timestamp = value => new Date(value).toISOString();
  const record = event => {history.push({...event, at: timestamp(now())}); if (history.length > 100) history.shift();};
  function findSession(req) {
    const pairs = (req.headers.cookie || '').split(';').map(value => value.trim());
    const values = pairs.filter(pair => pair.startsWith(`${COOKIE}=`)).map(pair => pair.slice(COOKIE.length + 1));
    if (values.length !== 1 || !/^[a-f0-9]{64}$/.test(values[0])) return null;
    const session = sessions.get(values[0]);
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(values[0]);
      record({type: 'expired', generation: session.generation, identity: session.identity});
      return null;
    }
    return {...session, token: values[0]};
  }
  function invalidate(session, reason) {
    if (!session) return;
    sessions.delete(session.token);
    record({type: reason, generation: session.generation, identity: session.identity});
  }
  function issueSession(res, identity) {
    const token = randomBytes(32).toString('hex');
    const session = {identity, generation: ++generation, createdAt: now(), expiresAt: now() + TTL * 1000};
    sessions.set(token, session);
    // Loopback HTTP teaching mode. Secure is intentionally absent; production HTTPS is separate.
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=900`);
    record({type: identity ? 'authenticated-session-created' : 'anonymous-session-created', generation, identity});
    return session;
  }
  const clearCookie = res => res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  const safeSession = session => session ? {
    identity: session.identity, authenticated: Boolean(session.identity), generation: session.generation,
    createdAt: timestamp(session.createdAt), expiresAt: timestamp(session.expiresAt)
  } : null;
  async function readJson(req) {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw {status: 415, code: 'json-required'};
    if (Number(req.headers['content-length']) > 4096) {req.resume(); throw {status: 413, code: 'body-too-large'};}
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) throw {status: 413, code: 'body-too-large'};
      chunks.push(chunk);
    }
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
      return body;
    } catch {throw {status: 400, code: 'invalid-json'};}
  }
  const exactlyKeys = (body, keys) => Object.keys(body).sort().join(',') === [...keys].sort().join(',');
  const server = createServer(async (req, res) => {
    const requestId = `lab-${String(++requestCounter).padStart(5, '0')}`;
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const json = (status, data) => {
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({requestId, ...data}));
    };
    try {
      const boundPort = server.address()?.port;
      const authority = `127.0.0.1:${boundPort}`;
      if (req.headers.host !== authority) return json(421, {error: 'loopback-host-required'});
      const url = new URL(req.url, `http://${authority}`);
      if (staticFiles.has(url.pathname)) {
        if (!['GET', 'HEAD'].includes(req.method)) {res.setHeader('Allow', 'GET, HEAD'); return json(405, {error: 'method-not-allowed'});}
        const [name, type] = staticFiles.get(url.pathname);
        const content = await readFile(new URL(`./public/${name}`, import.meta.url));
        res.writeHead(200, {'Content-Type': type});
        return res.end(req.method === 'HEAD' ? undefined : content);
      }
      const routes = new Map([
        ['/api/state', 'GET'], ['/api/book', 'GET'], ['/api/resource', 'GET'],
        ['/api/session/start', 'POST'], ['/api/login', 'POST'], ['/api/logout', 'POST'],
        ['/api/clock', 'POST'], ['/api/reset', 'POST']
      ]);
      const method = routes.get(url.pathname);
      if (!method) return json(404, {error: 'route-not-found'});
      if (req.method !== method) {res.setHeader('Allow', method); return json(405, {error: 'method-not-allowed'});}
      if (req.headers.origin && req.headers.origin !== `http://${authority}`) return json(403, {error: 'origin-not-allowed'});
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) return json(403, {error: 'same-origin-required'});
      if (url.pathname !== '/api/book' && url.pathname !== '/api/resource' && url.search) return json(400, {error: 'query-not-supported'});
      const body = method === 'POST' ? await readJson(req) : null;
      if (body && !['/api/login', '/api/clock'].includes(url.pathname) && !exactlyKeys(body, [])) return json(400, {error: 'empty-object-required'});
      let session = findSession(req);
      if (url.pathname === '/api/state') {
        // Sweep expiry so the store viewer does not present stale active rows.
        for (const [token, item] of sessions) if (item.expiresAt <= now()) {
          sessions.delete(token);
          record({type: 'expired', generation: item.generation, identity: item.identity});
        }
        return json(200, {clock: timestamp(now()), session: safeSession(session), activeSessions: [...sessions.values()].map(safeSession), ledger: history, traces, identities: Object.values(fixtures.identities), sessionTtlSeconds: TTL});
      }
      if (url.pathname === '/api/session/start') {
        invalidate(session, 'replaced');
        return json(201, {session: safeSession(issueSession(res, null)), event: 'anonymous-session-created'});
      }
      if (url.pathname === '/api/login') {
        if (!exactlyKeys(body, ['identity']) || typeof body.identity !== 'string' || !Object.hasOwn(fixtures.identities, body.identity)) return json(400, {error: 'select-provided-identity'});
        invalidate(session, 'rotated');
        return json(200, {session: safeSession(issueSession(res, body.identity)), event: 'login-and-rotation'});
      }
      if (url.pathname === '/api/logout') {
        invalidate(session, 'logout'); clearCookie(res);
        return json(200, {session: null, event: 'logout'});
      }
      if (url.pathname === '/api/clock') {
        if (!exactlyKeys(body, ['seconds']) || !Number.isInteger(body.seconds) || body.seconds < 1 || body.seconds > 3600) return json(400, {error: 'seconds-must-be-integer-1-to-3600'});
        offset += body.seconds;
        return json(200, {clock: timestamp(now()), event: 'demo-clock-advanced'});
      }
      if (url.pathname === '/api/reset') {
        sessions.clear(); history.length = 0; traces.length = 0; offset = 0; generation = 0;
        clearCookie(res);
        return json(200, {event: 'lab-namespace-reset', clock: timestamp(now())});
      }
      if ([...url.searchParams.keys()].join(',') !== 'case') return json(400, {error: 'one-provided-case-required'});
      const caseName = url.searchParams.get('case');
      if (url.pathname === '/api/book') {
        if (!['found', 'missing'].includes(caseName)) return json(400, {error: 'select-found-or-missing'});
        const book = caseName === 'found' ? fixtures.books[0] : null;
        const trace = {requestId, kind: 'book', case: caseName, steps: ['HTTP request accepted', 'handler chooses seeded case', 'in-memory lookup (no database connection)', book ? 'row found' : 'no row', 'JSON serialization'], status: book ? 200 : 404};
        traces.push(trace); if (traces.length > 100) traces.shift();
        return json(trace.status, book ? {book, trace} : {error: 'book-not-found', trace});
      }
      if (!['own', 'other-owner', 'other-tenant', 'write-own'].includes(caseName)) return json(400, {error: 'select-provided-resource-case'});
      const subject = session?.identity ? fixtures.identities[session.identity] : null;
      const owner = subject?.id || 'alice';
      const object = caseName === 'other-tenant' ? fixtures.resources.Orion : caseName === 'other-owner' ? fixtures.resources[owner === 'alice' ? 'bob' : 'alice'] : fixtures.resources[owner];
      const action = caseName === 'write-own' ? 'write' : 'read';
      const decision = evaluatePolicy(subject, object, action, validatedPolicy);
      const status = !subject ? 401 : decision.allowed ? 200 : 403;
      if (status === 401) res.setHeader('WWW-Authenticate', 'LabSession realm="local-demo"');
      const trace = {requestId, kind: 'policy', case: caseName, actor: subject?.id || 'anonymous', action, object: object.id, actorTenant: subject?.tenant || null, objectTenant: object.tenant, result: decision.allowed ? 'allow' : 'deny', reason: decision.reason, status};
      traces.push(trace); if (traces.length > 100) traces.shift();
      // Case fixture metadata is public teaching material; denied resource contents stay out of the response.
      return json(status, {decision: trace, ...(decision.allowed ? {resource: {id: object.id, title: object.title}} : {error: decision.reason}), ...(decision.allowed && action === 'write' ? {observation: 'Permission evaluated only; no record was changed.'} : {})});
    } catch (error) {
      if (!res.headersSent) json(error.status || 500, {error: error.code || 'lab-internal-error'});
      else res.end();
    }
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const policyIndex = args.indexOf('--policy');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 4191;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be 1024–65535');
  const policy = policyIndex >= 0 ? JSON.parse(await readFile(resolve(args[policyIndex + 1]), 'utf8')) : defaultPolicy;
  const server = createLabServer({policy});
  server.on('error', error => {process.stderr.write(`Lab startup failed: ${error.code || 'unknown'}\n`); process.exitCode = 1;});
  server.listen(port, '127.0.0.1', () => process.stdout.write(`Hacker Directory local lab: http://127.0.0.1:${port}/\n`));
}
