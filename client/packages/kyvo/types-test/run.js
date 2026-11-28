// Runs every type check and fails (exit 1) if any regresses. TypeScript is not a dependency of this repo:
//   TS_PATH=/path/to/node_modules/typescript node run.js     (needs TypeScript >= 5.1)
const { spawnSync } = require('child_process'), path = require('path');
const tsPath = process.env.TS_PATH || (() => { try { return path.dirname(path.dirname(require.resolve('typescript'))); } catch (e) { return null; } })();
if (!tsPath) { console.error('TypeScript (>= 5.1) is not installed in this repo. Run with TS_PATH=/path/to/node_modules/typescript'); process.exit(2); }
const env = { ...process.env, TS_PATH: tsPath, TSC: path.join(tsPath, 'lib/tsc.js') };
const step = (name, args, extra = {}) => {
  const r = spawnSync('node', args, { cwd: __dirname, env: { ...env, ...extra }, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  console.log(`${r.status === 0 ? 'PASS' : 'FAIL'}  ${name}`);
  if (r.status !== 0) console.log(out.split('\n').map(l => '      ' + l).join('\n'));
  return r.status === 0;
};
const ok = [
  step('declarations compile; positive.tsx has no errors and every @ts-expect-error in negative.tsx is a real error', [env.TSC, '-p', '.']),
  step('editor behavior: completions, hovers and diagnostics (language service)', ['editor.js']),
  step('real journal app, plain JS: store/style/event mistakes caught (>= 4 of 8)', ['real-app.js'], { SEED: '1', EXPECT_CAUGHT: '4' }),
  step('real journal app, one JSDoc line per ctx component: >= 7 of 8 caught', ['real-app.js'], { SEED: '1', ANNOTATE: '1', EXPECT_CAUGHT: '7' })
];
console.log(ok.every(Boolean) ? '\nall type checks passed' : '\nTYPE CHECKS FAILED');
process.exit(ok.every(Boolean) ? 0 : 1);
