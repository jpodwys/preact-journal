// Builds test/boot.spec.js with the shipped production esbuild options so the
// real entry (client/js/index.js) runs MINIFIED in the bootstrap smoke test.
// The entry is resolved exactly as webpack's NormalModuleReplacementPlugin does
// in karma.boot.conf.js: the spec's `require('../client/js/index.js')` is
// redirected to BOOT_ENTRY (abs path) when set, else to the real file. The
// require stays inside the test body, so esbuild wraps the entry in a lazy
// module initializer that only runs when the test calls it (verified by the
// 'in' scenario, which seeds state first and would render Login if eager).
// MANGLE=1 adds mangleProps: /^_/.
const path = require('path');
const fs = require('fs');
const { root, baseOptions, esbuild } = require('./esbuild-options');

const outDir = path.join(__dirname, '.prod-boot');
const realEntry = path.join(root, 'client/js/index.js');
const entryOverride = process.env.BOOT_ENTRY ? path.resolve(process.env.BOOT_ENTRY) : null;

const appEntryPlugin = {
  name: 'app-entry',
  setup (build) {
    build.onResolve({ filter: /client[\\/]js[\\/]index\.js$/ }, () => ({ path: entryOverride || realEntry }));
  }
};

esbuild.build({
  ...baseOptions(outDir),
  entryPoints: [path.join(__dirname, 'boot.spec.js')],
  outfile: path.join(outDir, 'bundle.js'),
  plugins: [appEntryPlugin]
}).then(() => {
  const size = fs.statSync(path.join(outDir, 'bundle.js')).size;
  console.log(`built boot.spec.js -> test/.prod-boot/bundle.js (${size} bytes, mangle=${process.env.MANGLE === '1'}, entry=${entryOverride || 'client/js/index.js'})`);
}).catch(() => process.exit(1));
