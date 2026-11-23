// Bundles every client/**/*.spec.js with the shipped build's esbuild options
// (shared via test/esbuild-options.js), so the same specs run against minified,
// production-targeted code. MANGLE=1 additionally mangles `_`-prefixed props.
const path = require('path');
const fs = require('fs');
const { root, baseOptions, esbuild } = require('./esbuild-options');

const outDir = path.join(__dirname, '.prod');

function walk (dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap(e => {
      const p = path.join(dir, e.name);
      if(e.isDirectory()) return e.name === 'packages' ? [] : walk(p);   // kyvo has its own runner
      return /\.spec\.js$/.test(e.name) ? [p] : [];
    });
}

const specs = walk(path.join(root, 'client'));
fs.mkdirSync(outDir, { recursive: true });
// Entry lives inside the app dir so relative resolution and node_modules lookup
// behave as they do for the real sources.
const entry = path.join(outDir, 'entry.js');
fs.writeFileSync(entry, specs.map(f => `import ${JSON.stringify(f)};`).join('\n') + '\n');

esbuild.build({
  ...baseOptions(outDir),
  entryPoints: [entry],
  outfile: path.join(outDir, 'bundle.js')
}).then(r => {
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(r.metafile));
  const size = fs.statSync(path.join(outDir, 'bundle.js')).size;
  console.log(`built ${specs.length} specs -> test/.prod/bundle.js (${size} bytes, mangle=${process.env.MANGLE === '1'})`);
}).catch(() => process.exit(1));
