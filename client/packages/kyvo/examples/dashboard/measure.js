// How long a render takes in each iteration, in headless Chrome with a production build.
//   node measure.js          this machine's speed
//   node measure.js 4        with a 4x CPU slowdown, a rough stand-in for a mid-range phone
// A "render" is a kyvo flush plus a forced layout (see instrument.js); paint is not included.
const fs = require('fs'), os = require('os'), path = require('path');
const { buildApp } = require('./build.js');
const { launchChrome } = require('../../../../../test/artifact/cdp.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const throttle = +process.argv[2] || 1;

(async () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'kyvo-dashboard-'));
  try {
    await buildApp({ prod: true, outdir: site });
    console.log(`CPU slowdown ${throttle}x\niteration   render p50   p95 (ms)   fps   busy %   DOM nodes`);
    for (const iter of [1, 2, 3, 4]) {
      const chrome = await launchChrome(), page = chrome.page;
      try {
        const run = async (expression, awaitPromise) => (await page.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })).result.value;
        await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
        if (throttle > 1) await page.send('Emulation.setCPUThrottlingRate', { rate: throttle });
        await page.send('Page.navigate', { url: `file://${site}/index.html?iter=${iter}` });
        while (!(await run('window.__ready === true'))) await sleep(100);
        await sleep(2500);
        const m = await run('window.__measure(6000)', true);
        console.log([String(iter).padEnd(9), m.work.p50.toFixed(1).padStart(12), m.work.p95.toFixed(1).padStart(10), String(m.fps).padStart(7), String(m.busyPct).padStart(7), String(m.domNodes).padStart(10)].join(' '));
      } finally { await chrome.close(); }
    }
  } finally { fs.rmSync(site, { recursive: true, force: true }); }
})();
