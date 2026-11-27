// BUILT ARTIFACT + REAL CSP + REAL SERVICE WORKER. node:test runner, no dependencies.
//   node --test test/artifact/artifact.spec.js        (needs a prior build: node test/artifact/build-artifact.js)
//   node test/run-artifact.js                          (build + run)
// Mutation proofs (env ARTIFACT_MUTATE): wrong-csp | corrupt-bundle | api-500
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DIST } = require('./build-artifact');
const { createServer } = require('./static-server');
const { openSession, sleep } = require('./driver');

const MUTATE = process.env.ARTIFACT_MUTATE || '';
// The build shortens class names (gulpfile renameClasses). Selectors go through this, and an unknown name is an error, so an
// "is absent" assertion cannot pass just because the name changed.
const cls = name => {
  const short = JSON.parse(fs.readFileSync(path.join(DIST, 'class-map.json'), 'utf8'))[name];
  assert.ok(short, 'renamed class ' + name);
  return short;
};
const ENTRIES = [
  { id: 5, date: '2024-01-01', text: 'original entry text' },
  { id: 6, date: '2024-01-02', text: 'second entry text' }
];

before(() => {
  if(!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('no built artifact at ' + DIST + ' (run node test/artifact/build-artifact.js)');
  if(MUTATE === 'corrupt-bundle') {
    // Truncate the inlined bundle, then recompute the CSP hash so the CSP does NOT
    // mask the corruption: the failure must come from the broken JS itself.
    const p = path.join(DIST, 'index.html');
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/, (_, o, body, c) => o + body.slice(0, body.length - 3000) + c);
    fs.writeFileSync(p, html);
    const hashes = [];
    html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g, (_, b) => hashes.push(crypto.createHash('sha256').update(b).digest('base64')));
    fs.writeFileSync(path.join(DIST, 'csp-hash.json'), JSON.stringify({ hashes }));
    for(const f of fs.readdirSync(DIST)) if(f.endsWith('.br')) fs.unlinkSync(path.join(DIST, f));
  }
});

async function withApp (fn, apiOverrides = {}) {
  const srvOpts = MUTATE === 'wrong-csp' ? { hashes: [crypto.createHash('sha256').update('not the bundle').digest('base64')] } : {};
  const server = await createServer(DIST, srvOpts);
  const apiState = { entries: [], syncEntries: [], timestamp: 2000, createdId: 777, offline: false,
    listStatus: MUTATE === 'api-500' ? 500 : 0, ...apiOverrides };
  const s = await openSession(server.origin, apiState);
  try { await fn(s, server, apiState); }
  finally { await s.close(); await server.close(); }
}

const hdr = (headers, name) => { for(const k of Object.keys(headers || {})) if(k.toLowerCase() === name) return headers[k]; };
const fmt = list => JSON.stringify(list, null, 1);

async function seed (s, entries) {
  await s.evaluate(`(async () => {
    localStorage.setItem('accounts', JSON.stringify([{ id: 99, username: 'alice', active: true }]));
    localStorage.setItem('timestamp_99', '1000');
    // Same layout idb-keyval@4 creates: db 'keyval-store', object store 'keyval'.
    await new Promise((res, rej) => {
      const r = indexedDB.open('keyval-store');
      r.onupgradeneeded = () => r.result.createObjectStore('keyval');
      r.onerror = () => rej(r.error);
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put(${JSON.stringify(entries)}, 'entries_99');
        tx.oncomplete = () => { db.close(); res(); };
        tx.onerror = () => rej(tx.error);
      };
    });
    return true;
  })()`);
}

function assertClean (s) {
  assert.deepEqual(s.csp, [], 'CSP violations:\n' + fmt(s.csp));
  assert.deepEqual(s.errors, [], 'console errors / exceptions:\n' + fmt(s.errors));
}

describe('built artifact (real build, real CSP header, real sw.js)', { concurrency: false }, () => {

  test('1. logged-out: Login renders, no console errors, no CSP violations, CSP header carries the artifact hash', { timeout: 60000 }, async () => {
    await withApp(async (s, server) => {
      await s.goto('/');
      await s.waitFor(`!!document.querySelector('form') && document.body.innerText.includes('Login')`, { label: 'Login page rendered' });
      const doc = s.responses.find(r => r.type === 'Document');
      assert.ok(doc, 'document response recorded');
      const csp = hdr(doc.headers, 'content-security-policy');
      const hashes = JSON.parse(fs.readFileSync(path.join(DIST, 'csp-hash.json'), 'utf8')).hashes;
      assert.ok(hashes.length >= 1, 'artifact has at least one inline-script hash');
      for(const h of hashes) assert.ok(csp.includes(`'sha256-${h}'`), 'CSP header lacks artifact hash ' + h + ': ' + csp);
      assert.match(csp, /^default-src 'self'; script-src 'self' 'sha256-[^;]+; style-src 'unsafe-inline'; frame-ancestors 'none'$/);
      assert.equal(await s.evaluate(`document.querySelectorAll('.${cls('entry-preview')}').length`), 0);
      assert.ok(await s.evaluate(`!!document.getElementById('luser') && !!document.getElementById('lpass')`), 'login fields');
      // Quirks mode matches class names case-insensitively, so short names that differ only in case would share their styles.
      const shorts = Object.values(JSON.parse(fs.readFileSync(path.join(DIST, 'class-map.json'), 'utf8')));
      assert.equal(new Set(shorts.map(n => n.toLowerCase())).size, shorts.length, 'short class names are distinct ignoring case');
      await sleep(300); // let late errors surface
      assert.deepEqual(s.unmocked, [], 'no unmocked API calls');
      assert.deepEqual(s.api, [], 'logged-out boot makes no API calls: ' + fmt(s.api));
      assertClean(s);
    });
  });

  test('2. logged-in: seeded entries render, link navigates, edit PATCHes, create POSTs', { timeout: 60000 }, async () => {
    await withApp(async (s) => {
      await s.goto('/');
      await s.waitFor(`document.body.innerText.includes('Login')`, { label: 'first load (logged out)' });
      await seed(s, ENTRIES);
      await s.reload();

      await s.waitFor(`document.body.innerText.includes('2 Entries')`, { label: 'header count' });
      assert.ok(await s.evaluate(`!!document.querySelector('a[href="/entry/5"]') && document.body.innerText.includes('original entry text')`), 'entry visible');
      await s.click('a[href="/entry/5"]');
      await s.waitFor(`location.pathname === '/entry/5' && !!document.getElementById('et') && document.getElementById('et').innerText.includes('original entry text')`, { label: 'entry view' });
      assert.ok(await s.evaluate(`!!document.querySelector('[aria-label="Delete entry"]')`), 'entry view has Delete button');

      // Edit -> debounced PATCH reaches the (mocked) network with the right body.
      await s.typeInto('#et', 'edited in the built artifact');
      const t0 = Date.now();
      while(!s.api.some(a => a.method === 'PATCH') && Date.now() - t0 < 5000) await sleep(50);
      const patch = s.api.find(a => a.method === 'PATCH');
      assert.ok(patch, 'PATCH reached the network: ' + fmt(s.api));
      assert.equal(patch.path, '/api/entry/5');
      assert.equal(patch.body.text, 'edited in the built artifact');

      // Create: back to the list, FAB -> /entry/new, type, debounced POST.
      await s.evaluate(`history.back()`);
      await s.waitFor(`location.pathname === '/entries' && !!document.querySelector('a[href="/entry/new"]')`, { label: 'back on list with FAB' });
      await s.click('a[href="/entry/new"]');
      await s.waitFor(`location.pathname === '/entry/new' && !!document.getElementById('et')`, { label: 'new entry view' });
      await s.typeInto('#et', 'brand new entry');
      const t1 = Date.now();
      while(!s.api.some(a => a.method === 'POST') && Date.now() - t1 < 5000) await sleep(50);
      const post = s.api.find(a => a.method === 'POST');
      assert.ok(post, 'POST reached the network: ' + fmt(s.api));
      assert.equal(post.path, '/api/entry');
      assert.equal(post.body.text, 'brand new entry');
      assert.ok(s.api.some(a => a.method === 'GET' && a.path === '/api/entries/sync/1000'), 'boot synced from stored timestamp');
      // Back on the list, the new row slides in once: it carries fade-right while the browser animates it, and the mark
      // is cleared again after the animation window.
      await s.evaluate(`history.back()`);
      await s.waitFor(`location.pathname === '/entries' && !!document.querySelector('.${cls('entry-preview')}.${cls('fade-right')}')`, { label: 'new row slides in' });
      await s.waitFor(`!document.querySelector('.${cls('fade-right')}')`, { label: 'slide-in mark cleared', timeout: 5000 });
      await sleep(300);
      assert.deepEqual(s.unmocked, [], 'no unmocked API calls');
      assertClean(s);
    }, { entries: [], syncEntries: [] });
  });

  // Regression: the router handled /entry/new before the cached entries had been read from IndexedDB, so saving the blank
  // new entry replaced the whole cache, offline edits that had not reached the server included.
  test('4. a page load on /entry/new keeps the entries cached on the device', { timeout: 60000 }, async () => {
    await withApp(async (s, server, apiState) => {
      const UNSENT = { id: 7, date: '2024-01-03', text: 'offline edit not sent yet', needsSync: true };
      const cached = () => s.evaluate(`new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => {
        const q = r.result.transaction('keyval').objectStore('keyval').get('entries_99'); q.onsuccess = () => { r.result.close(); res((q.result || []).map(e => e.id)); }; }; })`);
      const assertKept = async when => {
        await s.waitFor(`!!document.getElementById('et')`, { label: 'new entry view, ' + when });
        await sleep(500);   // give a wrong write time to happen: nothing on screen signals it
        const ids = await cached();
        for(const id of [5, 6, 7]) assert.ok(ids.includes(id), `entry ${id} is still cached after ${when}: ${JSON.stringify(ids)}`);
      };
      await s.goto('/');
      await s.waitFor(`document.body.innerText.includes('Login')`, { label: 'first load' });
      await seed(s, [...ENTRIES, UNSENT]);

      apiState.offline = true;                          // nothing can be refetched or re-sent
      await s.goto('/entry/new');
      await assertKept('a page load, offline');
      await s.reload();
      await assertKept('a reload, offline');

      apiState.offline = false;
      await s.goto('/entry/new');
      await s.waitFor(`!!document.getElementById('et')`, { label: 'new entry view, online' });
      await s.typeInto('#et', 'written after a page load');
      // Wait for THIS request: the earlier page loads have already sent POSTs, and the editor saves 500 ms after typing.
      const created = () => s.api.some(a => a.method === 'POST' && a.body.text === 'written after a page load');
      const t0 = Date.now();
      while(!created() && Date.now() - t0 < 5000) await sleep(50);
      assert.ok(created(), 'what was typed right after the page load is saved: ' + fmt(s.api));
      await assertKept('a page load and writing an entry');
      await s.goto('/entries');
      await s.waitFor(`['original entry text', 'second entry text', 'offline edit not sent yet', 'written after a page load'].every(t => document.body.innerText.includes(t))`, { label: 'all entries listed' });
    });
  });

  // The same bug from the other side: the app renders without waiting for the cache, so it has to be safe to use meanwhile.
  test('5. the app is usable while the cache read is pending, and a failed read leaves the cache alone', { timeout: 60000 }, async () => {
    await withApp(async (s) => {
      const cached = () => s.evaluate(`new Promise(res => { const r = indexedDB.open('keyval-store'); r.addEventListener('success', () => {
        const q = r.result.transaction('keyval').objectStore('keyval').get('entries_99'); q.addEventListener('success', () => { r.result.close(); res((q.result || []).map(e => e.id)); }); }); })`);
      // Replaces the handler the app gives indexedDB.open: delayed until __release(), or never called at all.
      const gate = body => s.page.send('Page.addScriptToEvaluateOnNewDocument', { source: `{
        const d = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
        Object.defineProperty(IDBOpenDBRequest.prototype, 'onsuccess', { configurable: true, set(fn) { ${body} } });
      }` });
      await s.goto('/');
      await s.waitFor(`document.body.innerText.includes('Login')`, { label: 'first load' });
      await seed(s, ENTRIES);

      let script = await gate(`d.set.call(this, e => { window.__release = () => fn.call(this, e); });`);
      await s.goto('/entry/new');
      await s.waitFor(`!!document.getElementById('et') && !!window.__release`, { label: 'editor on screen while the read is pending' });
      await s.typeInto('#et', 'typed before the cache arrived');
      await sleep(800);   // past the editor's save delay: nothing on screen signals that it ran
      await s.evaluate('__release()');
      const t0 = Date.now();
      while((await cached()).length < 3 && Date.now() - t0 < 5000) await sleep(50);
      const ids = await cached();
      assert.ok(ids.includes(5) && ids.includes(6) && ids.length === 3, 'cached entries plus the new one: ' + JSON.stringify(ids));
      assert.deepEqual(s.api.filter(a => a.method === 'POST').map(a => a.body.text), ['typed before the cache arrived'], 'sent once, and never as an empty entry');
      assert.equal(await s.evaluate(`document.getElementById('et').innerText`), 'typed before the cache arrived', 'the editor kept its text');
      await s.page.send('Page.removeScriptToEvaluateOnNewDocument', script);

      await s.goto('/entries');   // a page without the gate: the one above still has the patched IndexedDB
      await s.waitFor(`!!document.querySelector('a[href="/entry/5"]')`, { label: 'clean page' });
      await seed(s, ENTRIES);
      script = await gate('');   // the app's read never answers
      await s.goto('/entry/new');
      await s.waitFor(`!!document.getElementById('et')`, { label: 'renders with a read that never answers' });
      await sleep(300);
      assert.deepEqual(await cached(), [5, 6], 'nothing was saved over the unread cache');
    });
  });

  test('3. real service worker: registers, controls on 2nd load, shell renders offline from SW cache', { timeout: 90000 }, async () => {
    await withApp(async (s, server, apiState) => {
      await s.goto('/');
      await s.waitFor(`document.body.innerText.includes('Login')`, { label: 'first load' });
      // sw.js is registered by client/js/index.js; wait for activation.
      const scope = await s.evaluate(`navigator.serviceWorker.ready.then(r => r.scope)`);
      assert.equal(scope, server.origin + '/');
      // The worker's install re-fetches '/' right after the page loaded it. The ETag makes that second fetch a
      // conditional request answered 304, so the page is not downloaded twice on a first visit.
      await s.waitFor(`caches.open('preact-journal').then(c => c.keys()).then(k => k.length >= 2)`, { label: 'install precache done' });
      const shell = server.requests.filter(r => r.method === 'GET' && r.path === '/').map(r => r.status);
      assert.deepEqual(shell, [200, 304], 'first visit: the page once (200), the install-time fetch revalidated (304): ' + shell);
      // Installability: Chrome needs a manifest icon whose purpose includes "any" (>= 144 px). A maskable-only
      // manifest parses fine but reports manifest-missing-suitable-icon, and the browser offers no install.
      const { installabilityErrors } = await s.page.send('Page.getInstallabilityErrors');
      assert.deepEqual(installabilityErrors, [], 'page is installable: ' + JSON.stringify(installabilityErrors));
      // Second-load control rule: the first page load is NOT controlled (sw.js has no
      // clients.claim()), so reload once and require a controller.
      assert.equal(await s.evaluate(`!!navigator.serviceWorker.controller`), false, 'first load is uncontrolled (expected)');
      await s.reload();
      await s.waitFor(`!!navigator.serviceWorker.controller`, { label: 'page controlled after reload' });
      // Poll for the precache: the controlled render below depends on it.
      await s.waitFor(`caches.open('preact-journal').then(c => c.keys()).then(k => { const p = k.map(r => new URL(r.url).pathname); return p.includes('/') && p.includes('/manifest.json') ? p : false; })`, { label: 'SW cache filled' });

      await seed(s, ENTRIES);
      await s.reload();
      await s.waitFor(`document.body.innerText.includes('2 Entries')`, { label: 'online controlled render' });
      assert.ok(s.responses.filter(r => r.type === 'Document').pop().fromServiceWorker, 'controlled document came via the service worker');

      // Go offline for real: server stopped, API calls fail, HTTP cache bypassed, CDP offline.
      apiState.offline = true;
      await server.close();
      await s.page.send('Network.setCacheDisabled', { cacheDisabled: true });
      await s.page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      s.responses.length = 0;
      await s.reload();
      await s.waitFor(`document.body.innerText.includes('2 Entries') && !!document.querySelector('a[href="/entry/5"]')`, { label: 'offline shell + IDB entries', timeout: 15000 });
      const doc = s.responses.find(r => r.type === 'Document');
      assert.ok(doc && doc.status === 200 && doc.fromServiceWorker, 'offline document served by the service worker: ' + fmt(doc));
      // Deep link while offline (sw maps /entry/* to the cached '/').
      await s.goto('/entry/5');
      await s.waitFor(`!!document.getElementById('et') && document.getElementById('et').innerText.includes('original entry text')`, { label: 'offline deep link renders entry', timeout: 15000 });
      const deep = s.responses.filter(r => r.type === 'Document').pop();
      assert.ok(deep.fromServiceWorker && deep.status === 200, 'offline deep link served by SW');
      assert.deepEqual(s.csp, [], 'no CSP violations offline either:\n' + fmt(s.csp));
    });
  });
});
