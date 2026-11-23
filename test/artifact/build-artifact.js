// Runs the REAL gulp build pipeline (a verbatim copy of the repo-root
// gulpfile.js) in an isolated directory against a copy of a client/ tree, so the
// resulting dist/ is exactly what `gulp build` would ship for that source.
//
//   node test/artifact/build-artifact.js
//   ARTIFACT_CLIENT=/abs/path/to/client node test/artifact/build-artifact.js
//
// Layout produced (git-ignored by convention, regenerated every run):
//   <app>/.test-artifact/{gulpfile.js,package.json,.babelrc?,client/,node_modules -> repo node_modules,dist/}
// Never touches the repo's own dist/. Exports { build, ARTIFACT_ROOT, DIST }.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const zlib = require('zlib');

const APP = path.resolve(__dirname, '../..');
const ARTIFACT_ROOT = process.env.ARTIFACT_ROOT || path.join(APP, '.test-artifact');
const DIST = path.join(ARTIFACT_ROOT, 'dist');

function findRepoRoot () {
  // Nearest ancestor with gulpfile.js + node_modules (the repo root).
  let dir = APP;
  while(true) {
    if(fs.existsSync(path.join(dir, 'gulpfile.js')) && fs.existsSync(path.join(dir, 'node_modules/gulp'))) return dir;
    const up = path.dirname(dir);
    if(up === dir) throw new Error('repo root (gulpfile.js + node_modules) not found above ' + APP);
    dir = up;
  }
}

function copyTree (src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for(const e of fs.readdirSync(src, { withFileTypes: true })) {
    if(e.name === '.DS_Store' || /\.spec\.js$/.test(e.name)) continue; // specs are not part of the build
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if(e.isDirectory()) copyTree(s, d); else fs.copyFileSync(s, d);
  }
}

function build () {
  const repo = findRepoRoot();
  const clientSrc = path.resolve(process.env.ARTIFACT_CLIENT || path.join(APP, 'client'));
  if(!fs.existsSync(path.join(clientSrc, 'js/index.js'))) throw new Error('no js/index.js in ' + clientSrc);

  fs.rmSync(ARTIFACT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });
  // Read-only sources from the repo root; we only copy them.
  // The gulpfile is this app's own (it defines __DEV__ as false); package.json/.babelrc come from the repo.
  fs.copyFileSync(path.join(APP, 'gulpfile.js'), path.join(ARTIFACT_ROOT, 'gulpfile.js'));
  for(const f of ['package.json', '.babelrc']) {
    if(fs.existsSync(path.join(repo, f))) fs.copyFileSync(path.join(repo, f), path.join(ARTIFACT_ROOT, f));
  }
  copyTree(clientSrc, path.join(ARTIFACT_ROOT, 'client'));
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(ARTIFACT_ROOT, 'node_modules'), 'dir');

  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['node_modules/gulp/bin/gulp.js', 'build'], {
    cwd: ARTIFACT_ROOT, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' }
  });
  const ms = Date.now() - t0;
  if(r.status !== 0) {
    process.stderr.write(r.stdout + r.stderr);
    throw new Error('gulp build failed (exit ' + r.status + ')');
  }
  for(const f of ['index.html', 'sw.js', 'csp-hash.json', 'version.json', 'manifest.json', 'styles.css']) {
    if(!fs.existsSync(path.join(DIST, f))) throw new Error('artifact is missing dist/' + f);
  }
  return { ms, clientSrc, log: r.stdout };
}

function sizes () {
  const out = {};
  for(const f of ['index.html', 'bundle.js', 'sw.js', 'styles.css']) {
    const p = path.join(DIST, f);
    if(!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    out[f] = { raw: buf.length, br: fs.existsSync(p + '.br') ? fs.statSync(p + '.br').size : null };
  }
  return out;
}

module.exports = { build, sizes, ARTIFACT_ROOT, DIST };

if(require.main === module) {
  const { ms, clientSrc } = build();
  console.log(`artifact built from ${clientSrc} in ${ms} ms -> ${path.relative(APP, DIST)}`);
  console.log(JSON.stringify(sizes()));
  console.log('dist: ' + fs.readdirSync(DIST).join(' '));
}
