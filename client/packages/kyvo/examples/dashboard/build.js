// usage: node build.js app          dev build -> dist/app.js (then open index.html)
//        PROD=1 node build.js app   minified, __DEV__ false (use this to look at performance)
const esbuild = require('esbuild'), fs = require('fs'), path = require('path');

// `outdir` gets a whole runnable copy of the page, for the test and the measurement script.
function buildApp({ prod = false, outdir } = {}) {
  const site = outdir || __dirname;
  if (outdir) for (const f of ['index.html', 'instrument.js', 'theme.css']) fs.copyFileSync(path.join(__dirname, f), path.join(outdir, f));
  return esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main.js')], outfile: path.join(site, 'dist/app.js'), bundle: true, format: 'iife',
    loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h', define: { __DEV__: prod ? 'false' : 'true' }, minify: prod, logLevel: 'error'
  });
}

module.exports = { buildApp };

if (require.main === module) buildApp({ prod: process.env.PROD === '1' }).catch(() => process.exit(1));
