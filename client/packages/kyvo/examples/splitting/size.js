// What splitting does to the bytes: each file of the production build (minified, __DEV__ false, brotli q11), the first
// download, and the same app as one file. The point of the example is the first-download number, not the total.
const zlib = require('zlib'), fs = require('fs'), path = require('path'), os = require('os');
const { buildApp, buildOneFile } = require('./build.js');
const br = b => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
(async () => {
  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'kyvo-splitting-'));
  await buildApp({ prod: true, mangle: true, outdir });
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(outdir);
  const sizes = files.map(f => ({ name: path.relative(outdir, f), raw: fs.statSync(f).size, br: br(fs.readFileSync(f)) }));
  sizes.sort((a, b) => a.name.localeCompare(b.name));
  const pad = (v, n) => String(v).padStart(n);
  console.log('file'.padEnd(34), pad('raw', 7), pad('brotli', 7));
  sizes.forEach(s => console.log(s.name.padEnd(34), pad(s.raw, 7), pad(s.br, 7)));
  // The first download: main.js plus every file it imports statically, recursively (dynamic import() is not followed).
  const first = new Set(), visit = name => {
    if (first.has(name)) return;
    first.add(name);
    const src = fs.readFileSync(path.join(outdir, name), 'utf8');
    for (const m of src.matchAll(/\bfrom\s*"([^"]+)"/g)) visit(path.relative(outdir, path.resolve(path.dirname(path.join(outdir, name)), m[1])));
  };
  visit('main.js');
  const sum = names => sizes.filter(s => names.has ? names.has(s.name) : names.includes(s.name)).reduce((n, s) => n + s.br, 0);
  const one = (await buildOneFile()).outputFiles[0].contents;
  console.log('\nfirst download :', sum(first), 'brotli in', first.size, 'files:', [...first].join(', '));
  console.log('one file       :', br(Buffer.from(one)), 'brotli in 1 file');
  console.log('all the pages  :', sizes.reduce((n, s) => n + s.br, 0), 'brotli in', sizes.length, 'files (splitting costs this much extra if you visit everything)');
  fs.rmSync(outdir, { recursive: true });
})();
