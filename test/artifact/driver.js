// Page driver on top of cdp.js: network-layer API mocking via CDP Fetch domain,
// request recording, and capture of console errors / uncaught exceptions / CSP
// violations. The service worker is NOT stubbed anywhere.
const { launchChrome } = require('./cdp');

const JSON_HEADERS = [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Response shapes copied from server/middleware/entry-handlers.js + user-handlers.js
// (and statuses from the repo-root test/api-mocks.js): list/sync -> {entries,timestamp},
// create -> {id}, update/delete/logout -> 204, login -> {id, username}.
function makeApiMock (state) {
  // state: { entries, timestamp, createdId, offline, listStatus }
  return function route (method, pathname) {
    if(state.offline) return { fail: 'InternetDisconnected' };
    let m;
    if(method === 'GET' && pathname === '/api/entries') {
      return state.listStatus ? { status: state.listStatus } : { status: 200, json: { entries: state.entries, timestamp: state.timestamp } };
    }
    if(method === 'GET' && (m = /^\/api\/entries\/sync\/(\d+)$/.exec(pathname))) {
      return state.listStatus ? { status: state.listStatus } : { status: 200, json: { entries: state.syncEntries || [], timestamp: state.timestamp } };
    }
    if(method === 'POST' && pathname === '/api/user/login') return { status: 200, json: { id: 99, username: 'alice' } };
    if(method === 'POST' && pathname === '/api/user/logout') return { status: 204 };
    if(method === 'POST' && pathname === '/api/entry') return { status: 200, json: { id: state.createdId } };
    if((method === 'PATCH' || method === 'DELETE') && /^\/api\/entry\/\d+$/.test(pathname)) return { status: 204 };
    return null; // unmocked
  };
}

async function openSession (origin, apiState) {
  const chrome = await launchChrome();
  const { page } = chrome;
  const route = makeApiMock(apiState);
  const s = {
    chrome, page, origin,
    requests: [],        // every request the page made (Network domain) + api bodies
    api: [],             // intercepted /api/* calls: { method, path, body, status }
    unmocked: [],
    errors: [],          // console errors, exceptions, Log errors (kind-tagged)
    csp: [],             // securitypolicyviolation events
    responses: [],       // main-frame/document + sub-responses with fromServiceWorker flag
  };

  page.on('Runtime.exceptionThrown', p => s.errors.push({ kind: 'exception', text: (p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text }));
  page.on('Runtime.consoleAPICalled', p => {
    if(p.type === 'error') s.errors.push({ kind: 'console.error', text: p.args.map(a => a.value || a.description || '').join(' ') });
  });
  page.on('Log.entryAdded', p => {
    if(p.entry.level === 'error') s.errors.push({ kind: 'log:' + p.entry.source, text: p.entry.text + (p.entry.url ? ' [' + p.entry.url + ']' : '') });
  });
  page.on('Runtime.bindingCalled', p => {
    if(p.name !== '__report') return;
    const r = JSON.parse(p.payload);
    if(r.type === 'csp') s.csp.push(r);
    else s.errors.push({ kind: r.type, text: r.text });
  });
  page.on('Network.requestWillBeSent', p => s.requests.push({ method: p.request.method, url: p.request.url, type: p.type }));
  page.on('Network.responseReceived', p => s.responses.push({
    url: p.response.url, status: p.response.status, type: p.type,
    fromServiceWorker: !!p.response.fromServiceWorker, headers: p.response.headers
  }));
  page.on('Fetch.requestPaused', async p => {
    const u = new URL(p.request.url);
    const r = route(p.request.method, u.pathname);
    const rec = { method: p.request.method, path: u.pathname, body: p.request.postData ? safeJson(p.request.postData) : undefined };
    s.api.push(rec);
    try {
      if(!r) { s.unmocked.push(rec); rec.status = 'unmocked'; return await page.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'Failed' }); }
      if(r.fail) { rec.status = r.fail; return await page.send('Fetch.failRequest', { requestId: p.requestId, errorReason: r.fail }); }
      rec.status = r.status;
      const body = r.json ? Buffer.from(JSON.stringify(r.json)).toString('base64') : '';
      await page.send('Fetch.fulfillRequest', {
        requestId: p.requestId, responseCode: r.status,
        responseHeaders: r.json ? JSON_HEADERS : [], body
      });
    } catch(e) { /* page navigated away mid-request */ }
  });

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
  await page.send('Runtime.addBinding', { name: '__report' });
  // Observation only: reports errors and CSP violations back over a binding.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    addEventListener('securitypolicyviolation', e => __report(JSON.stringify({ type: 'csp', directive: e.violatedDirective, blocked: e.blockedURI, sample: e.sample })));
    addEventListener('error', e => __report(JSON.stringify({ type: 'window.onerror', text: String(e.message) })));
    addEventListener('unhandledrejection', e => __report(JSON.stringify({ type: 'unhandledrejection', text: String(e.reason && e.reason.message || e.reason) })));
  ` });

  s.evaluate = async (expression) => {
    const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if(r.exceptionDetails) throw new Error('evaluate failed: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result.value;
  };
  s.waitFor = async (expression, { timeout = 8000, label } = {}) => {
    const end = Date.now() + timeout;
    let last;
    while(Date.now() < end) {
      try { last = await s.evaluate(expression); if(last) return last; } catch(e) { last = e.message; }
      await sleep(50);
    }
    throw new Error(`waitFor timed out (${timeout}ms): ${label || expression} (last: ${JSON.stringify(last)})\n` +
      `  CSP violations: ${JSON.stringify(s.csp)}\n  errors: ${JSON.stringify(s.errors)}\n  unmocked api: ${JSON.stringify(s.unmocked)}`);
  };
  s.goto = async (url) => {
    const loaded = new Promise(r => page.on('Page.loadEventFired', function once () { r(); }));
    const { errorText } = await page.send('Page.navigate', { url: url.startsWith('http') ? url : origin + url });
    if(errorText) throw new Error('navigate failed: ' + errorText);
    await Promise.race([loaded, sleep(10000)]);
  };
  s.reload = async () => {
    const loaded = new Promise(r => page.on('Page.loadEventFired', function once () { r(); }));
    await page.send('Page.reload');
    await Promise.race([loaded, sleep(10000)]);
  };
  s.text = () => s.evaluate('document.body.innerText');
  // Real mouse click at the center of the element (Input domain, not el.click()).
  s.click = async (selector) => {
    const pt = await s.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if(!e) return null;
      e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
    if(!pt) throw new Error('click: no element ' + selector);
    for(const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    }
  };
  // Replace the content of a contenteditable via real focus + native text insertion.
  s.typeInto = async (selector, text) => {
    await s.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.focus(); document.execCommand('selectAll'); })()`);
    await page.send('Input.insertText', { text });
  };
  s.close = () => chrome.close();
  return s;
}

function safeJson (t) { try { return JSON.parse(t); } catch(e) { return t; } }

module.exports = { openSession, sleep };
