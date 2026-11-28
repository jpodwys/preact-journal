// Entry point for the built-artifact mode: build (real gulp pipeline, isolated) then run the spec.
//   node test/run-artifact.js            build + run   (ARTIFACT_CLIENT=<abs client dir> to build another tree)
//   ARTIFACT_MUTATE=wrong-csp|corrupt-bundle|api-500 node test/run-artifact.js   mutation proofs (expected to FAIL / report)
// Exit code is non-zero on any failure. Requires Node >= 22.
const { spawnSync } = require('child_process');
const path = require('path');
if(typeof WebSocket === 'undefined') { console.error('artifact mode requires Node >= 22 (found ' + process.version + ')'); process.exit(2); }
const { build, sizes } = require('./artifact/build-artifact');

const b = build();
console.log(`artifact built in ${b.ms} ms from ${b.clientSrc}`);
const z = sizes();
console.log('sizes (raw/br): ' + Object.entries(z).map(([k, v]) => `${k} ${v.raw}/${v.br === null ? '-' : v.br}`).join(', '));
const t0 = Date.now();
const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'artifact/artifact.spec.js')], { stdio: 'inherit', env: process.env });
console.log(`artifact spec: ${r.status === 0 ? 'PASSED' : 'FAILED (exit ' + r.status + ')'} in ${Date.now() - t0} ms`);
process.exit(r.status === null ? 1 : r.status);
