// usage: node size.js   (from this folder)  ->  the framework's production size: minified, __DEV__ false, brotli q11.
// Named imports, like a real tree-shaken app (a namespace import would add esbuild's __export helper).
const esbuild = require('esbuild'), zlib = require('zlib'), path = require('path');
const br = b => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const root = path.resolve(__dirname, '..');
function measure(label, code, extra = {}) {
  const r = esbuild.buildSync({
    stdin: { contents: code, resolveDir: root, loader: 'js' }, bundle: true, minify: true, format: 'iife',
    write: false, define: { __DEV__: 'false' }, logLevel: 'error', ...extra
  });
  const out = r.outputFiles[0].contents;
  console.log(label.padEnd(36), String(out.length).padStart(6), 'raw', String(br(Buffer.from(out))).padStart(6), 'brotli');
}
const keep = 'globalThis.__x = ';
const CORE = `import { h, render, store, watch } from './core.js'; ${keep} [h, render, store, watch];`;
const ALL = `import { h, render, store, watch } from './core.js'; import { listen, debounced } from './helpers.js'; ${keep} [h, render, store, watch, listen, debounced];`;
measure('kyvo core (h, render, store, watch)', CORE);
measure('kyvo core + helpers', ALL);
measure('kyvo core + helpers, mangled _', ALL, { mangleProps: /^_/ });
