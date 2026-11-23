// usage: node build.js test        bundle the specs (dev) -> test/bundle.spec.js
//        PROD=1 node build.js test minified, __DEV__=false
//        node build.js app         dev app bundle -> dist/app.js (open index.html)
const esbuild = require('esbuild'), path = require('path');
const [mode] = process.argv.slice(2), prod = process.env.PROD === '1';
const common = { bundle: true, format: 'iife', loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h',
  define: { __DEV__: prod ? 'false' : 'true' }, ...(prod ? { minify: true } : {}) };
const job = mode === 'app'
  ? { entryPoints: [path.join(__dirname, 'src/main.js')], outfile: path.join(__dirname, 'dist/app.js') }
  : { entryPoints: [path.join(__dirname, 'test/tasks.spec.js')], outfile: path.join(__dirname, 'test/bundle.spec.js') };
esbuild.build({ ...common, ...job }).catch(() => process.exit(1));
