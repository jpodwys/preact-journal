// usage: node build.js app          dev build -> dist/app.js (then open index.html)
//        PROD=1 node build.js app   minified, __DEV__ false
//        node build.js test         the specs -> test/bundle.spec.js, for karma (PROD=1 for the minified bundle)
const esbuild = require('esbuild'), fs = require('fs'), path = require('path');
const [mode] = process.argv.slice(2), prod = process.env.PROD === '1';

// `import text from './file.js?source'` is the file as text: the Code tab shows exactly what runs.
const source = {
  name: 'source',
  setup(b) {
    b.onResolve({ filter: /\?source$/ }, a => ({ path: path.join(a.resolveDir, a.path.replace('?source', '')), namespace: 'source' }));
    b.onLoad({ filter: /./, namespace: 'source' }, a => ({ contents: fs.readFileSync(a.path, 'utf8'), loader: 'text' }));
  }
};

const entry = mode === 'test'
  ? { entryPoints: [path.join(__dirname, 'test/gallery.spec.js')], outfile: path.join(__dirname, 'test/bundle.spec.js') }
  : { entryPoints: [path.join(__dirname, 'src/main.js')], outfile: path.join(__dirname, 'dist/app.js') };

esbuild.build({
  ...entry, bundle: true, format: 'iife', loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h', plugins: [source],
  // `kyvo/core` and `kyvo/helpers` are this package's own files, so the shown code reads like an app's.
  alias: { kyvo: path.join(__dirname, '../..') },
  define: { __DEV__: prod ? 'false' : 'true' }, minify: prod, charset: 'utf8'
}).catch(() => process.exit(1));
