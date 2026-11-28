// The real thing, in a real browser: build the example with code splitting, serve it, and watch which files are fetched.
// (The karma specs bundle everything into one file, so they cannot see this.) Runs the same checks against the dev build
// and the minified + property-mangled build: mangling must agree across chunks, which only holds if they come from one build.
//   node --test test/split.spec.js        needs Node >= 22 (global WebSocket) and Chrome (CHROME_BIN to point at one)
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { buildApp } = require('../build.js');
const { createServer } = require('../serve.js');
const { launchChrome } = require('../../../../../../test/artifact/cdp.js');
const MUTATIONS = require('./mutations.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const VARIANTS = [['dev build', {}], ['production build, mangled', { prod: true, mangle: true }]];

for (const [label, opts] of VARIANTS) {
  describe(label, () => {
    let site, chrome, page;
    before(async () => {
      site = fs.mkdtempSync(path.join(os.tmpdir(), 'kyvo-split-'));
      // SPLIT_MUTATE=<name> builds a deliberately broken app (see mutations.js); test/mutation-check.js uses it.
      await buildApp({ ...opts, outdir: path.join(site, 'dist'), plugins: process.env.SPLIT_MUTATE ? [MUTATIONS[process.env.SPLIT_MUTATE]] : [] });
      fs.copyFileSync(path.join(__dirname, '../index.html'), path.join(site, 'index.html'));
      chrome = await launchChrome();
      page = chrome.page;
      await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
    });
    after(async () => { await chrome.close(); fs.rmSync(site, { recursive: true, force: true }); });

    // Each test gets its own server, so its own origin: empty localStorage, empty module map, its own request log.
    let server, problems;
    const open = async () => {
      server = await createServer(site);
      const mine = problems = [];
      page.on('Runtime.exceptionThrown', p => mine.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
      page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') mine.push('console.error: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
      await page.send('Page.navigate', { url: server.origin + '/' });
      await waitFor(`document.body.innerText.includes('Field notes')`, 'home renders');
    };
    // Runs a test against a fresh server, and always stops it, so a failing test cannot leave the process hanging.
    const app = fn => async () => { await open(); try { await fn(); } finally { await server.close(); } };

    const ev = async expr => {
      const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('evaluate failed: ' + expr + ' -> ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    async function waitFor(expr, what, timeout = 8000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) { if (await ev(expr)) return; await sleep(25); }
      throw new Error('timed out waiting for: ' + what + '\npage text: ' + (await ev('document.body.innerText')) + '\nrequests: ' + js().join(', '));
    }
    const js = () => server.requests.filter(r => r.url.endsWith('.js')).map(r => r.url.replace('/dist/', ''));
    const fetched = re => server.requests.filter(r => re.test(r.url) && r.status === 0).length;
    const go = path => ev(`location.hash = '#${path}'`);
    const setValue = (sel, v) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const text = () => ev('document.body.innerText');

    test('the first load fetches the shell, and not one page', app(async () => {
      const files = js();
      assert.ok(files.includes('main.js'), 'main.js: ' + files);
      assert.deepEqual(files.filter(f => /\/(notes|note|stats)-/.test(f)), [], 'no route chunk yet: ' + files);
      assert.ok(files.length <= 3, 'main + the chunk(s) it imports: ' + files);
      // Judge by what was shipped, not only by file names: a page imported statically would be merged into these files.
      const shipped = files.map(f => fs.readFileSync(path.join(site, 'dist', f), 'utf8')).join('\n');
      for (const marker of ['distinct words', 'Add note', 'That note is gone']) assert.ok(!shipped.includes(marker), 'the first download contains a page: ' + marker);
      assert.match(await text(), /Loaded so far: nothing yet/);
      assert.deepEqual(problems, []);
    }));

    test('a route\'s chunk is fetched on its first visit, once, and never for a route not visited', app(async () => {
      await go('/notes');
      await waitFor(`!!document.querySelector('[aria-label=Notes]')`, 'notes page');
      assert.equal(fetched(/\/chunks\/notes-/), 1);
      assert.equal(fetched(/\/chunks\/(stats|note)-/), 0, 'other routes stay unfetched: ' + js());
      await go('/'); await go('/notes'); await go('/');
      await waitFor(`document.body.innerText.includes('Loaded so far: notes')`, 'home lists notes');
      assert.equal(fetched(/\/chunks\/notes-/), 1, 'a revisit does not fetch again');
      assert.deepEqual(problems, []);
    }));

    test('routes that use the same slice share one chunk for it, fetched once', app(async () => {
      await go('/notes'); await waitFor(`!!document.querySelector('[aria-label=Notes]')`, 'notes');
      const before = new Set(js());
      await go('/stats'); await waitFor(`!!document.querySelector('[aria-label=Stats]')`, 'stats');
      const imports = f => [...fs.readFileSync(path.join(site, 'dist', f), 'utf8').matchAll(/\bfrom\s*"\.\/([^"]+)"/g)].map(m => m[1]);
      const chunkOf = name => js().find(f => f.includes('/' + name + '-'));
      const common = imports(chunkOf('notes')).filter(f => imports(chunkOf('stats')).includes(f));
      assert.ok(common.length >= 1, 'notes and stats import a shared chunk');
      for (const f of common) assert.equal(server.requests.filter(r => r.url.endsWith(f)).length, 1, f + ' fetched once');
      assert.ok(js().length > before.size, 'visiting stats fetched something new');
      assert.deepEqual(problems, []);
    }));

    test('hovering a link starts its chunk early, without navigating', app(async () => {
      assert.equal(fetched(/\/chunks\/stats-/), 0);
      await ev(`document.querySelector('a[href="#/stats"]').dispatchEvent(new MouseEvent('mouseenter'))`);
      const t0 = Date.now();
      while (!fetched(/\/chunks\/stats-/) && Date.now() - t0 < 5000) await sleep(25);
      assert.equal(fetched(/\/chunks\/stats-/), 1, 'fetched on hover');
      assert.equal(await ev('location.hash'), '', 'still on Home');
      await go('/stats');
      await waitFor(`!!document.querySelector('[aria-label=Stats]')`, 'stats');
      assert.equal(fetched(/\/chunks\/stats-/), 1, 'the click reused the early fetch');
      assert.deepEqual(problems, []);
    }));

    test('a chunk that fails to load shows the failure, and Retry loads it', app(async () => {
      server.fail(/\/chunks\/stats-/);
      await go('/stats');
      await waitFor(`!!document.querySelector('[role=alert]') && document.body.innerText.includes('Could not load this page')`, 'failure shown');
      server.heal();
      await click('[role=alert] button');
      await waitFor(`!!document.querySelector('[aria-label=Stats]')`, 'stats after retry');
      assert.equal(server.requests.filter(r => /\/chunks\/stats-/.test(r.url)).length, 2, 'one failed attempt, one good');
    }));

    test('the whole app works across chunks: add, open, edit, count, reset', app(async () => {
      await ev(`localStorage.setItem('splitting:stats-ui', '{"sort":"alpha"}')`);   // saved by a chunk that has not loaded
      await go('/notes');
      await waitFor(`!!document.querySelector('[aria-label="New note"]')`, 'notes');
      await setValue('[aria-label="New note"]', 'rain on the cat');
      await ev(`document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`);
      await waitFor(`document.querySelector('[aria-label="Note list"]').innerText.includes('rain on the cat')`, 'note listed');
      await click('[aria-label="Note list"] a');
      await waitFor(`!!document.querySelector('[aria-label="Note text"]')`, 'note page');
      await setValue('[aria-label="Note text"]', 'rain on the cat and the hat');
      await go('/stats');
      await waitFor(`!!document.querySelector('[aria-label=Words]')`, 'stats');
      assert.deepEqual((await ev(`Array.from(document.querySelector('[aria-label=Words]').children).map(li => li.textContent)`)), ['cat 1', 'hat 1', 'rain 1']);
      assert.match(await text(), /Sort: alpha/, 'hydrated the saved sort');
      await click('nav button');                                                    // Reset data
      await waitFor(`document.querySelector('[aria-label=Words]').children.length === 0`, 'stats emptied');
      assert.deepEqual(await ev(`Object.keys(localStorage).filter(k => k.startsWith('splitting:'))`), [], 'every saved key swept');
      assert.deepEqual(problems, []);
    }));
  });
}
