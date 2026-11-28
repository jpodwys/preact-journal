// Production size of the example app (minified, __DEV__=false, brotli q11), and how much of it is the framework.
const esbuild = require('esbuild'), zlib = require('zlib'), path = require('path');
const br = b => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const r = esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src/main.js')], bundle: true, minify: true, write: false, outfile: 'x.js',
  loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h', define: { __DEV__: 'false' }, metafile: true, logLevel: 'error' });
const out = Object.values(r.metafile.outputs)[0].inputs;
let fw = 0, app = 0;
for (const [f, v] of Object.entries(out)) (/packages\/kyvo\/(core|helpers)\.js$/.test(path.resolve(f)) ? (fw += v.bytesInOutput) : (app += v.bytesInOutput));
console.log('total', r.outputFiles[0].contents.length, 'raw,', br(Buffer.from(r.outputFiles[0].contents)), 'brotli | framework share', fw, 'raw, app code', app, 'raw');
