// Does every iteration still boot and keep updating? Not a performance test (see ../measure.js).
//   node --test test/smoke.spec.js     needs Node >= 22 and Chrome (CHROME_BIN to point at one)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { buildApp } = require('../build.js');
const { launchChrome } = require('../../../../../../test/artifact/cdp.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
let site;
before(async () => {
  site = fs.mkdtempSync(path.join(os.tmpdir(), 'kyvo-dashboard-test-'));
  await buildApp({ outdir: site });    // dev build: the framework's checks are on
});
after(() => fs.rmSync(site, { recursive: true, force: true }));

for (const iter of [1, 2, 3, 4]) {
  test(`iteration ${iter} boots, renders live data and raises no errors`, { timeout: 60000 }, async () => {
    const chrome = await launchChrome(), page = chrome.page, errors = [];
    try {
      const run = async expression => (await page.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
      await page.send('Runtime.enable');
      page.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
      // small sizes: this checks behaviour, not speed
      await page.send('Page.navigate', { url: `file://${site}/index.html?iter=${iter}&N=${iter === 1 ? 40 : 500}&rate=2000` });
      for (let i = 0; i < 100 && !(await run('window.__ready === true')); i++) await sleep(100);
      assert.equal(await run('window.__ready === true'), true, errors.join('\n'));
      const text = () => run("document.getElementById('app').textContent");
      await sleep(500);
      const first = await text();
      await sleep(700);
      assert.notEqual(await text(), first, 'the page stopped updating');
      assert.deepEqual(errors, []);
    } finally { await chrome.close(); }
  });
}
