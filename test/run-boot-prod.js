// Builds the minified boot bundle once, then runs both scenarios (in, out).
// Exit code non-zero if the build or either scenario fails.
// Usage: node test/run-boot-prod.js   (MANGLE=1 to mangle `_` props; BOOT_ENTRY=<abs> to swap the entry)
const { spawnSync } = require('child_process');
const path = require('path');
const app = path.resolve(__dirname, '..');
const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { cwd: app, stdio: 'inherit', env: { ...process.env, ...env } }).status;

if(!process.env.CHROME_BIN) {
  const fs = require('fs');
  const c = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find(p => fs.existsSync(p));
  if(c) process.env.CHROME_BIN = c;
}

let failed = false;
if(run('node', ['test/build-boot-prod.js']) !== 0) process.exit(1);
for(const scenario of ['in', 'out']) {
  console.log(`\n--- boot (minified) scenario=${scenario} mangle=${process.env.MANGLE === '1'} ---`);
  const code = run('npx', ['karma', 'start', 'test/karma.boot-prod.conf.js', '--single-run'], { BOOT_SCENARIO: scenario });
  if(code !== 0) { failed = true; console.log(`scenario ${scenario}: FAILED (exit ${code})`); }
}
console.log(failed ? '\nBOOT-PROD: FAILED' : '\nBOOT-PROD: both scenarios passed');
process.exit(failed ? 1 : 0);
