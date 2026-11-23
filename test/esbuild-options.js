// Single source of truth for the esbuild options used by every production-shaped
// test mode in this directory. Mirrors the shipped build (repo-root gulpfile.js
// `scripts()`): minify, browserslist-derived target, jsx transform h/Fragment,
// `.js` loaded as jsx. Test-only additions: the Buffer inject and the `global`
// define (fetch-mock's bundled whatwg-url needs them; webpack 4 polyfilled them
// implicitly), SW_SOURCE define, and optional `_` property mangling (with `__karma__` reserved: boot.spec.js reads
// window.__karma__, which karma itself defines, so mangling it breaks the harness, not the app).
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const browserslist = require('browserslist');

const root = path.resolve(__dirname, '..');

const target = browserslist('last 2 versions, not dead, not ie > 0')
  .filter(b => ['chrome', 'firefox', 'safari', 'edge', 'opera'].some(name => b.startsWith(name)))
  .map(b => b.replace(' ', ''));

// outDir: where generated helper files (the Buffer shim) are written.
function baseOptions (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const bufferShim = path.join(outDir, 'buffer-shim.js');
  fs.writeFileSync(bufferShim, "export { Buffer } from 'buffer';\n");
  const swSource = fs.readFileSync(path.join(root, 'client/js/sw.js'), 'utf8');
  return {
    bundle: true,
    minify: true,
    format: 'iife',
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { '.js': 'jsx' },
    target,
    inject: [bufferShim],
    define: { SW_SOURCE: JSON.stringify(swSource), global: 'globalThis', __DEV__: 'false' },
    ...(process.env.MANGLE === '1' ? { mangleProps: /^_/, reserveProps: /^__karma__$/ } : {}),
    metafile: true,
    logLevel: 'warning'
  };
}

module.exports = { root, target, baseOptions, esbuild };
