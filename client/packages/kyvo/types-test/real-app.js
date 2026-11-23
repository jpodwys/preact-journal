// Type-checks the real journal app (plain JS + JSX, no annotations) against the .d.ts files, in a throwaway
// copy so the app is never touched. `node real-app.js [strict]`; `SEED=1` injects authoring mistakes first.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const TSC = process.env.TSC || path.join(path.dirname(require.resolve('typescript/package.json')), 'lib/tsc.js');   // run.js sets TSC from TS_PATH
const src = path.resolve(__dirname, '../../..'), dst = path.join(__dirname, '.real-app');   // src = the journal app (client/)
fs.rmSync(dst, { recursive: true, force: true });
(function copy(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    if (/\.spec\.js$/.test(e.name) || e.name === 'sw.js' || e.name === 'images' || e.name === 'css' || e.name === 'packages') continue;
    const sp = path.join(s, e.name), dp = path.join(d, e.name);
    e.isDirectory() ? copy(sp, dp) : /\.(js|ts)$/.test(e.name) && fs.copyFileSync(sp, dp);
  }
})(src, path.join(dst, 'client'));
// the framework itself: only its runtime files and declarations, in the same place the app imports them from
fs.mkdirSync(path.join(dst, 'client/packages/kyvo'), { recursive: true });
for (const f of ['core.js', 'helpers.js', 'core.d.ts', 'helpers.d.ts']) fs.copyFileSync(path.resolve(__dirname, '..', f), path.join(dst, 'client/packages/kyvo', f));
const strict = process.argv[2] === 'strict';
fs.writeFileSync(path.join(dst, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'es2022', module: 'esnext', moduleResolution: 'bundler', lib: ['es2022', 'dom', 'dom.iterable'],
    allowJs: true, checkJs: true, strict, noEmit: true, jsx: 'react', jsxFactory: 'h', skipLibCheck: true, types: [] },
  include: ['client/**/*.js', 'client/**/*.ts']
}, null, 2));
// What an adopter declares once at app level: Router passes `path` to its children, and ctx fields it hangs on ctx.
fs.writeFileSync(path.join(dst, 'client/app-types.d.ts'), `import './packages/kyvo/core';
declare module './packages/kyvo/core' { interface Ctx { el?: HTMLElement | null; ref?: (el: HTMLElement | null) => void } }
declare global { namespace JSX { interface IntrinsicAttributes { path?: string } } }
export {};
`);
if (process.env.ANNOTATE) require('./seed').annotate(path.join(dst, 'client'));
const run = () => {
  const r = cp.spawnSync('node', [TSC, '-p', dst], { encoding: 'utf8' });
  return (r.stdout || '').split('\n').filter(l => /error TS/.test(l) && !/spec-helpers/.test(l)).map(l => l.replace(/^.*?client\//, ''));
};
const base = run();
console.log(`${strict ? 'strict' : 'non-strict'} baseline (${process.env.ANNOTATE ? 'ctx typed with one JSDoc line on 3 components' : 'unannotated app'} + one app-level types file): ${base.length} errors`);
if (!process.env.SEED) { for (const l of base) console.log('  ' + l.slice(0, 200)); process.exit(0); }
require('./seed')(path.join(dst, 'client'));
const seeded = run();
const baseKeys = new Set(base.map(l => l.replace(/\(\d+,\d+\)/, '')));
const added = seeded.filter(l => !baseKeys.has(l.replace(/\(\d+,\d+\)/, '')));
console.log(`after seeding 8 mistakes: ${seeded.length} errors, ${added.length} new:`);
const MISTAKES = [
  ['mutate the store in place (app.entries.push)', /entry-actions.*'push' does not exist on type 'readonly/],
  ['typo in a ctx method (ctx.statee)', /virtual-scroll.*'statee' does not exist on type 'Ctx'/],
  ['unitless numeric style (top: 40)', /virtual-scroll.*'number' is not assignable to type 'string'/],
  ['misspelled store field (loggedInn)', /header.*'loggedInn' does not exist/],
  ['wrong event name (listen window "resizee")', /virtual-scroll.*No overload matches/],
  ['misspelled local-state field (s.txt)', /entry\/index.*'txt' does not exist/],
  ['ctx.mount arrow returning a timer id', /router.*'number' is not assignable to type 'void \| \(\(\) => void\)'/],
  ['wrong value type through an untyped helper (set({dark: "toggle"}))', /global-actions/]
];
let caught = 0;
for (const [name, re] of MISTAKES) { const hit = added.some(l => re.test(l)); caught += hit; console.log(`  ${hit ? 'CAUGHT' : 'missed'}  ${name}`); }
console.log(`${caught} of ${MISTAKES.length} seeded mistakes caught`);
process.env.EXPECT_CAUGHT && process.exit(caught >= +process.env.EXPECT_CAUGHT ? 0 : 1);
