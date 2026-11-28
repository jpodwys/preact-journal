// Drives TypeScript's language service (the engine behind editor autocomplete and hover) at cursor
// positions inside snippets of "code being authored", and asserts what an editor would offer.
//   TS_PATH=/path/to/typescript node editor.js
const path = require('path'), fs = require('fs');
const ts = require(process.env.TS_PATH || 'typescript');   // TS_PATH=/path/to/node_modules/typescript if it is not installed here
const ui = path.resolve(__dirname, '..');
const SCRATCH = path.join(__dirname, 'scratch-editor.tsx');
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], strict: true, jsx: ts.JsxEmit.React, jsxFactory: 'h', noEmit: true, types: [] };

let current = '';
const host = {
  getScriptFileNames: () => [SCRATCH, path.join(ui, 'core.d.ts'), path.join(ui, 'helpers.d.ts')],
  getScriptVersion: f => (f === SCRATCH ? String(current.length) + current.slice(0, 40) : '1'),
  getScriptSnapshot: f => f === SCRATCH ? ts.ScriptSnapshot.fromString(current) : fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined,
  getCurrentDirectory: () => __dirname, getCompilationSettings: () => options,
  getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory, directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories
};
const ls = ts.createLanguageService(host, ts.createDocumentRegistry());

const PRE = `import { h, store, watch, Ctx } from '${ui}/core';\nimport { listen, debounced } from '${ui}/helpers';\n`
  + `declare module '${ui}/core' { interface Ctx { el?: HTMLElement | null } }\n`
  + `const app = store({ view: '/entries', dark: false, entries: [] as { id: number; text: string }[] });\n`;

function at(code) {              // code contains one `|` marking the cursor
  const i = code.indexOf('|');
  current = PRE + code.replace('|', '');
  return PRE.length + i;
}
const names = (code, trigger) => {
  const pos = at(code);
  const r = ls.getCompletionsAtPosition(SCRATCH, pos, { includeCompletionsWithInsertText: true, triggerCharacter: trigger });
  return r ? r.entries.map(e => e.name) : [];
};
const hover = code => {
  const pos = at(code);
  const q = ls.getQuickInfoAtPosition(SCRATCH, pos);
  return q ? ts.displayPartsToString(q.displayParts) : '';
};
const diagnostics = code => { at(code + '|'); return ls.getSemanticDiagnostics(SCRATCH).map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')); };

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? '\n         ' + detail : '')); } };
const has = (list, ...want) => want.every(w => list.includes(w));
const lacks = (list, ...bad) => bad.every(b => !list.includes(b));

console.log('completions');
let c = names(`const C = (p: {}, ctx: Ctx) => { ctx.| };`, '.');
ok('ctx. offers state, mount and the app-declared field; nothing invented', has(c, 'state', 'mount', 'el') && lacks(c, 'statee', 'setState', 'useState'), c.slice(0, 12).join());
c = names(`const C = (p: {}, ctx: Ctx) => { const s = ctx.state({ editing: false, draft: '' }); s.| };`, '.');
ok('local state fields autocomplete from the initial object', has(c, 'editing', 'draft'), c.slice(0, 12).join());
c = names(`app.|`, '.');
ok('store fields autocomplete from the initial state', has(c, 'view', 'dark', 'entries'), c.slice(0, 12).join());
c = names(`app.entries.|`, '.');
ok('a stored array offers read methods but not push/sort/splice', has(c, 'map', 'filter', 'find', 'slice') && lacks(c, 'push', 'sort', 'splice', 'pop', 'reverse'), c.filter(n => /push|sort|splice|pop|reverse/.test(n)).join());
c = names(`const x = <input | />;`);
ok('JSX attributes on <input> include value, oninput/onInput, placeholder, ref, class, style, key', has(c, 'value', 'oninput', 'onInput', 'placeholder', 'ref', 'class', 'style', 'key', 'disabled', 'type'), c.slice(0, 15).join());
ok('JSX attributes do not offer methods or readonly DOM members as props', lacks(c, 'focus', 'click', 'addEventListener', 'offsetWidth', 'classList'), c.filter(n => /^(focus|click|offsetWidth|classList)$/.test(n)).join());
c = names(`const x = <button onclick={e => e.| } />;`, '.');
ok('inside onclick the event is a MouseEvent with currentTarget', has(c, 'preventDefault', 'clientX', 'currentTarget'), c.slice(0, 8).join());
c = names(`const x = <input onkeydown={e => e.| } />;`, '.');
ok('inside onkeydown the event has key and code', has(c, 'key', 'code'), c.slice(0, 8).join());
c = names(`const x = <input oninput={e => e.currentTarget.| } />;`, '.');
ok('inside oninput, currentTarget is the input (value, select, setSelectionRange)', has(c, 'value', 'select', 'setSelectionRange'), c.slice(0, 8).join());
c = names(`const x = <div style={{ | }} />;`);
ok('style objects offer CSS properties', has(c, 'top', 'position', 'marginTop', 'color'), c.slice(0, 8).join());
c = names(`const C = (p: {}, ctx: Ctx) => { listen(ctx, window, '|'); };`, "'");
ok("listen(ctx, window, '…') offers window event names", has(c, 'resize', 'scroll', 'keydown'), c.slice(0, 8).join());
c = names(`const C = (p: {}, ctx: Ctx) => { listen(ctx, document, 'keydown', e => e.| ); };`, '.');
ok('listen on document types the event (key available)', has(c, 'key'), c.slice(0, 8).join());
c = names(`const x = <svg | />;`);
ok('SVG elements accept arbitrary attributes plus class/style/key/ref', has(c, 'class', 'style', 'key', 'ref'), c.slice(0, 8).join());

console.log('hover');
let h1 = hover(`const e = app.ent|ries;`);
ok('hovering a store field shows it as readonly', /readonly/.test(h1), h1);
h1 = hover(`const C = (p: {}, ctx: Ctx) => { ctx.sta|te({ a: 1 }); };`);
ok('hovering ctx.state shows its signature', /state/.test(h1) && /Store/.test(h1), h1);
h1 = hover(`watch(app, (key, next) => { if (key === 'dark') { const n = ne|xt; } });`);
ok("after `if (key === 'dark')`, next is narrowed to boolean", /boolean/.test(h1) && !/string/.test(h1), h1);

console.log('diagnostics while authoring');
let d = diagnostics(`app.entries.push({ id: 1, text: 'x' });`);
ok('in-place mutation is flagged with a readonly message', d.length === 1 && /push/.test(d[0]), d.join(' | '));
d = diagnostics(`const x = <div style={{ top: 40 }} />;`);
ok('a unitless number in a style is flagged', d.length === 1, d.join(' | '));
d = diagnostics(`const C = (p: { n: number }) => <p>{p.n}</p>; const x = <C n="1" />;`);
ok('a wrong prop type on your own component is flagged', d.length === 1 && /string/.test(d[0]) && /number/.test(d[0]), d.join(' | '));
d = diagnostics(`const C = (p: {}, ctx: Ctx) => { const s = ctx.state({ n: 0 }); s.n = 'x'; return null; };`);
ok('a wrong value for a local state field is flagged', d.length === 1, d.join(' | '));
d = diagnostics(`const x = <ul>{app.entries.map(e => <li key={e.id}>{e.text}</li>)}{app.dark && <b />}{null}</ul>;`);
ok('idiomatic JSX (map, &&, null children) produces no diagnostics', d.length === 0, d.join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
try { fs.unlinkSync(SCRATCH); } catch (e) {}
process.exit(fail ? 1 : 0);
