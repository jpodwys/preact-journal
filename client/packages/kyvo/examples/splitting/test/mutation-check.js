// Proves the browser spec can fail: it runs the first-load check against a correct build (must pass) and against a build
// with the stats page imported statically (must fail, for the right reason). Takes a few seconds, and cannot hang: each run
// is a child process that is killed after a timeout. Nothing in the source tree is modified.
//   node test/mutation-check.js
const { spawnSync } = require('child_process'), path = require('path');
const spec = path.join(__dirname, 'split.spec.js');
const run = mutate => spawnSync(process.execPath, ['--test', '--test-force-exit', '--test-name-pattern=first load', spec], {
  env: { ...process.env, ...(mutate ? { SPLIT_MUTATE: mutate } : {}) }, encoding: 'utf8', timeout: 90000, killSignal: 'SIGKILL'
});
const text = r => (r.stdout || '') + (r.stderr || '');

const control = run();
if (control.status !== 0) { console.error('FAIL  control run (no mutation) did not pass:\n' + text(control)); process.exit(1); }
console.log('PASS  control: the first-load check passes on the correct build');

const broken = run('static-stats');
if (broken.error) { console.error('FAIL  mutated run did not finish: ' + broken.error.message); process.exit(1); }
if (broken.status === 0) { console.error('FAIL  a statically imported page was NOT caught by the browser spec'); process.exit(1); }
if (!/first download contains a page/.test(text(broken))) { console.error('FAIL  the mutated run failed, but not for the expected reason:\n' + text(broken)); process.exit(1); }
console.log('PASS  mutation caught: a statically imported page fails the first-load check ("the first download contains a page")');
