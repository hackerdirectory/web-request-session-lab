'use strict';
const $ = id => document.getElementById(id);
let pendingBook = null;
let requestVersion = 0;
let resetVersion = 0;
const format = value => JSON.stringify(value, null, 2);
function notice(message, error = false) {$('notice').textContent = message; $('notice').classList.toggle('error', error);}
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {cache: 'no-store'} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), cache: 'no-store'});
  const data = await response.json();
  return {status: response.status, requestId: response.headers.get('X-Request-ID'), data};
}
function appendTimeline(text) {const li = document.createElement('li'); li.textContent = text; $('book-timeline').append(li);}
function renderBook() {
  if (!pendingBook) return;
  $('book-result').textContent = pendingBook.status === 200 ? `${pendingBook.data.book.title} · ${pendingBook.data.book.pages} sayfa` : `Kitap bulunamadı · HTTP ${pendingBook.status}`;
  appendTimeline(`DOM update yapıldı · ${pendingBook.requestId}`);
  pendingBook = null; $('render').disabled = true;
}
async function refresh() {
  const started = resetVersion;
  const result = await api('/api/state');
  if (started !== resetVersion) return;
  if (result.status !== 200) throw new Error(result.data.error || 'state-load-failed');
  const state = result.data;
  $('session-summary').textContent = `${state.session ? `Generation ${state.session.generation} · ${state.session.identity || 'anonymous'} · authenticated: ${state.session.authenticated}` : 'Bu browser’a bağlı active session yok.'} Demo clock: ${state.clock}`;
  $('session-ledger').textContent = format({clock: state.clock, currentSession: state.session, activeSessions: state.activeSessions, lifecycle: state.ledger});
  $('trace').textContent = format(state.traces);
}
async function action(path, body) {const result = await api(path, body); notice(`${result.status} · ${result.data.event || result.data.error} · ${result.requestId}`, result.status >= 400); await refresh();}
function bind(id, handler) {$(id).addEventListener('click', async () => {try {await handler();} catch {notice('Yerel server’a erişilemedi. Terminalde server’ın çalıştığını kontrol edin.', true);}});}
bind('book-send', async () => {
  const version = ++requestVersion;
  pendingBook = null; $('render').disabled = true; $('book-timeline').replaceChildren();
  appendTimeline('Browser fetch başlattı.');
  const result = await api(`/api/book?case=${encodeURIComponent($('book-case').value)}`);
  if (version !== requestVersion) return;
  appendTimeline(`Response receipt ve JSON parsing tamamlandı · HTTP ${result.status} · ${result.requestId}`);
  pendingBook = result;
  $('render').disabled = false;
  if ($('hold-render').checked) notice('Body geldi; DOM hâlâ önceki state’inde. İkinci düğmeyi kullanın.');
  else renderBook();
  await refresh();
});
bind('render', renderBook);
bind('anonymous', () => action('/api/session/start', {}));
bind('login', () => action('/api/login', {identity: $('identity').value}));
bind('logout', () => action('/api/logout', {}));
bind('expire', () => action('/api/clock', {seconds: 301}));
bind('policy-send', async () => {const result = await api(`/api/resource?case=${encodeURIComponent($('resource-case').value)}`); $('policy-result').textContent = format({status: result.status, ...result.data}); await refresh();});
bind('refresh', refresh);
bind('reset', async () => {++requestVersion; ++resetVersion; pendingBook = null; $('render').disabled = true; $('book-timeline').replaceChildren(); $('book-result').textContent = 'Henüz request gönderilmedi.'; $('policy-result').textContent = 'Henüz karar yok.'; await action('/api/reset', {});});
bind('theme', () => document.body.classList.toggle('dark'));
refresh().catch(() => notice('Yerel server’a erişilemedi.', true));
