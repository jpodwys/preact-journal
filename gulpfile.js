require('dotenv').load();
var gulp = require('gulp');
var gulpTerser = require('gulp-terser');
var cleanCSS = require('gulp-clean-css');
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');
var esbuild = require('esbuild');
var browserslist = require('browserslist');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var del = require('del');
var replace = require('gulp-replace');

var COMPRESSIBLE_EXTS = /\.(html|js|css|json|svg|txt)$/i;
var PRECOMPRESS_MIN_BYTES = 1400; // matches shrinkRay threshold

function serve(cb) {
  require('./app.js');
  cb();
}

function scripts() {
  return esbuild.build({
    entryPoints: ['client/js/index.js'],
    bundle: true,
    minify: true,
    outfile: 'dist/bundle.js',
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { '.js': 'jsx' },
    mangleProps: /^_/, // kyvo's internal fields (_dom, _kids, ...) become short names
    define: { __DEV__: 'false' }, // strips kyvo's dev-only checks from the production bundle
    target: browserslist('last 2 versions, not dead, not ie > 0')
      .filter(b => ['chrome', 'firefox', 'safari', 'edge', 'opera'].some(name => b.startsWith(name)))
      .map(b => b.replace(' ', '')),
  });
}

function sw() {
  return gulp.src('client/js/sw.js')
    .pipe(replace("const VERSION = '';", "const VERSION = '" + Date.now() + "';"))
    .pipe(gulpTerser())
    .pipe(gulp.dest('./dist'));
}

function images() {
  return gulp.src('client/images/**.*')
    .pipe(gulp.dest('./dist'));
}

function manifest() {
  return gulp.src('client/manifest.json')
    .pipe(gulp.dest('./dist'));
}

// The source keeps its theme variables; the shipped CSS gets their values. Nothing reads them at runtime.
function styles() {
  var vars = {};
  fs.readFileSync('client/css/styles.css', 'utf8').replace(/(--[\w-]+):\s*([^;}]+)/g, function (m, name, value) { vars[name] = value; });
  return gulp.src('client/css/styles.css')
    .pipe(replace(/:root\s*\{[^}]*\}/, ''))
    .pipe(replace(/var\((--[\w-]+)\)/g, function (m, name) {
      if (!vars[name]) throw new Error('styles: undefined CSS variable ' + name);
      return vars[name];
    }))
    .pipe(cleanCSS({ level: 2 }))
    .pipe(gulp.dest('./dist'));
}

function clean() {
  return del(['./dist']);
}

// `unsafe` and `unsafe_arrows` trade correctness guarantees for ~25 B brotli. If the minified
// bundle misbehaves while dev/unit tests pass, remove them first. See README "Build notes".
function compress() {
  return gulp.src('dist/bundle.js')
    .pipe(gulpTerser({ ecma: 2020, toplevel: true, compress: { passes: 3, unsafe: true, unsafe_arrows: true } }))
    .pipe(gulp.dest('./dist'));
}

// Built from a variable part in components/dialog-wrapper (`modal-${mode}`), so they keep their names.
var KEEP_CLASSES = ['modal-menu', 'modal-modal'];

// Shortens every hyphenated (or rotateNN) class name in the built CSS and JS; the source keeps the readable ones. In the JS it
// replaces the name wherever it stands as a whole word, so such a name must only ever mean the class. A class the JS builds out
// of parts never appears whole, which fails the build. Also renames the animations that share those names.
// dist/class-map.json records the result for the tests.
function renameClasses(cb) {
  var css = fs.readFileSync('./dist/styles.css', 'utf8');
  var js = fs.readFileSync('./dist/bundle.js', 'utf8');
  var selectors = css.match(/\.-?[a-zA-Z_][\w-]*/g).map(function (s) { return s.slice(1); });
  var names = Array.from(new Set(selectors)).filter(function (n) {
    return /-|^rotate\d+$/.test(n) && KEEP_CLASSES.indexOf(n) < 0;
  });
  // Lowercase only: index.html has no doctype, and in quirks mode class names match case-insensitively, so `.l` also styles `L`.
  var abc = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var shorts = abc.concat(abc.map(function (l) { return 'z' + l; }))
    .filter(function (l) { return selectors.indexOf(l) < 0; });
  if (names.length > shorts.length) throw new Error('renameClasses: more classes than short names');
  var map = {};
  names.forEach(function (n, i) { map[n] = shorts[i]; });
  var whole = new RegExp('(?<![\\w-])(' + names.slice().sort(function (a, b) { return b.length - a.length; }).join('|') + ')(?![\\w-])', 'g');
  var short = function (n) { return map[n] || n; };

  var seen = new Set(js.match(whole));
  var missing = names.filter(function (n) { return !seen.has(n); });
  if (missing.length) throw new Error('renameClasses: styled but never named in the JS: ' + missing.join(', '));

  fs.writeFileSync('./dist/bundle.js', js.replace(whole, short));
  fs.writeFileSync('./dist/styles.css', css
    .replace(/\.(-?[a-zA-Z_][\w-]*)/g, function (m, n) { return '.' + short(n); })
    .replace(/(@keyframes |animation(?:-name)?:)([^;{}]+)/g, function (m, head, value) { return head + value.replace(whole, short); }));
  fs.writeFileSync('./dist/class-map.json', JSON.stringify(map));
  cb();
}

function inline() {
  return gulp.src('client/index.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true
    }))
    .pipe(inlinesource({
      rootpath: __dirname + '/dist',
      compress: false
    }))
    .pipe(gulp.dest('./dist'));
}

function cspHash(cb) {
  var html = fs.readFileSync('./dist/index.html', 'utf8');
  var hashes = [];
  var re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
  var match;
  while ((match = re.exec(html)) !== null) {
    hashes.push(crypto.createHash('sha256').update(match[1]).digest('base64'));
  }
  fs.writeFileSync('./dist/csp-hash.json', JSON.stringify({ hashes: hashes }));
  cb();
}

function precompress(cb) {
  fs.readdirSync('./dist').forEach(function (name) {
    if (!COMPRESSIBLE_EXTS.test(name)) return;
    var full = path.join('./dist', name);
    var buf = fs.readFileSync(full);
    if (buf.length < PRECOMPRESS_MIN_BYTES) return;
    var br = zlib.brotliCompressSync(buf, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length
      }
    });
    fs.writeFileSync(full + '.br', br);
  });
  cb();
}

function build(cb) {
  return gulp.series(
    clean,
    gulp.parallel(scripts, sw, manifest, images),
    gulp.parallel(styles, compress),
    renameClasses,
    inline,
    cspHash,
    precompress
  )(cb);
}

gulp.task('build', build);

gulp.task('serve', serve);

gulp.task('default', serve, build);
