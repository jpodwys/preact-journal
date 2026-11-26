// usage: node build.js app          code-split dev build  -> dist/   (then: node serve.js)
//        PROD=1 node build.js app   minified, __DEV__ false
//        PROD=1 MANGLE=1 ...        also mangleProps /^_/ (kyvo's internal names); one build call, so every chunk agrees
//        node build.js test         the specs as ONE bundle (no splitting) -> test/bundle.spec.js, for karma
const esbuild = require('esbuild'), path = require('path');
const root = __dirname;
const common = prod => ({ bundle: true, loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h',
  define: { __DEV__: prod ? 'false' : 'true' }, ...(prod ? { minify: true } : {}) });

// Code splitting needs ESM output and an outdir. Chunks are named after the module they come from (notes-HASH.js);
// code shared between chunks lands in chunk-HASH.js.
function buildApp({ prod = false, mangle = false, outdir = path.join(root, 'dist'), metafile = false, plugins = [] } = {}) {
  return esbuild.build({
    ...common(prod), entryPoints: [path.join(root, 'src/main.js')], outdir, format: 'esm', splitting: true,
    chunkNames: 'chunks/[name]-[hash]', metafile, plugins, logLevel: 'error',
    ...(prod && mangle ? { mangleProps: /^_/ } : {})
  });
}

// The same app as one file, to size what splitting costs and saves.
function buildOneFile({ prod = true } = {}) {
  return esbuild.build({
    ...common(prod), entryPoints: [path.join(root, 'src/main.js')], write: false, outfile: 'one.js', format: 'iife', logLevel: 'error'
  });
}

module.exports = { buildApp, buildOneFile };

if (require.main === module) {
  const [mode] = process.argv.slice(2), prod = process.env.PROD === '1';
  const job = mode === 'test'
    ? esbuild.build({ ...common(prod), format: 'iife', entryPoints: [path.join(root, 'test/app.spec.js')], outfile: path.join(root, 'test/bundle.spec.js') })
    : buildApp({ prod, mangle: process.env.MANGLE === '1' });
  job.catch(() => process.exit(1));
}
