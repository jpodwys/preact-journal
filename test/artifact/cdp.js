// Minimal zero-dependency Chrome DevTools Protocol client (Node >= 22: uses the
// built-in global WebSocket and fetch) plus a headless-Chrome launcher that ALWAYS
// cleans up: the browser is killed and the temp profile deleted on normal close,
// process 'exit', SIGINT/SIGTERM and uncaught errors.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

if(typeof WebSocket === 'undefined' || typeof fetch === 'undefined') {
  throw new Error('The artifact test mode needs Node >= 22 (global WebSocket); running ' + process.version);
}

function findChrome () {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if(!found) throw new Error('Chrome not found; set CHROME_BIN. Tried: ' + candidates.join(', '));
  return found;
}

class CDP {
  constructor (wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  connect () {
    return new Promise((resolve, reject) => {
      const ws = this.ws = new WebSocket(this.wsUrl);
      ws.onopen = () => resolve(this);
      ws.onerror = e => reject(new Error('CDP websocket error: ' + (e.message || this.wsUrl)));
      ws.onclose = () => { for(const { reject } of this.pending.values()) reject(new Error('CDP connection closed')); this.pending.clear(); };
      ws.onmessage = ev => {
        const msg = JSON.parse(ev.data);
        if(msg.id) {
          const p = this.pending.get(msg.id);
          if(!p) return;
          this.pending.delete(msg.id);
          msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
        } else if(msg.method) {
          for(const fn of this.handlers.get(msg.method) || []) fn(msg.params);
        }
      };
    });
  }
  send (method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on (method, fn) { (this.handlers.get(method) || this.handlers.set(method, []).get(method)).push(fn); }
  close () { try { this.ws.close(); } catch(e) {} }
}

const live = new Set(); // launched browsers, for crash cleanup
function killAll () {
  for(const b of live) {
    try { b.proc.kill('SIGKILL'); } catch(e) {}
    try { fs.rmSync(b.profile, { recursive: true, force: true }); } catch(e) {}
  }
  live.clear();
}
process.on('exit', killAll);
for(const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { killAll(); process.exit(130); });
process.on('uncaughtException', e => { console.error(e); killAll(); process.exit(1); });

async function launchChrome () {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-chrome-'));
  const proc = spawn(findChrome(), [
    '--headless=new', '--remote-debugging-port=0', '--remote-allow-origins=*',
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--disable-extensions', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const entry = { proc, profile };
  live.add(entry);

  const wsBrowser = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not report a DevTools port. stderr:\n' + buf)), 20000);
    proc.stderr.on('data', d => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if(m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', code => reject(new Error('Chrome exited early (' + code + '). stderr:\n' + buf)));
  }).catch(e => { killAll(); throw e; });

  const port = new URL(wsBrowser).port;
  let target;
  for(let i = 0; i < 50 && !target; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find(t => t.type === 'page');
    if(!target) await new Promise(r => setTimeout(r, 100));
  }
  if(!target) { killAll(); throw new Error('no page target'); }

  const browser = await new CDP(wsBrowser).connect();
  const page = await new CDP(target.webSocketDebuggerUrl).connect();

  async function close () {
    page.close();
    try { await Promise.race([browser.send('Browser.close'), new Promise(r => setTimeout(r, 3000))]); } catch(e) {}
    browser.close();
    await new Promise(r => { if(proc.exitCode !== null) return r(); proc.once('exit', r); setTimeout(r, 3000); });
    try { proc.kill('SIGKILL'); } catch(e) {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch(e) {}
    live.delete(entry);
  }
  return { page, browser, close, pid: proc.pid };
}

module.exports = { CDP, launchChrome };
