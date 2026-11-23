// usage: node build.js            dev bundle (the default)
//        PROD=1 node build.js     minified, __DEV__=false (dev-only specs skip themselves)
//        PROD=1 MANGLE=1 ...      also mangleProps /^_/
const esbuild = require('esbuild'), path = require('path');
const prod = process.env.PROD === '1';
esbuild.build({
  bundle: true, format: 'iife', loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h',
  define: { __DEV__: prod ? 'false' : 'true' },
  ...(prod ? { minify: true } : {}),
  ...(prod && process.env.MANGLE === '1' ? { mangleProps: /^_/ } : {}),
  entryPoints: [path.join(__dirname, 'all.spec.js')],
  outfile: path.join(__dirname, 'bundle.spec.js')
}).catch(() => process.exit(1));
