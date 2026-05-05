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
    target: browserslist('last 2 versions, not dead, not ie > 0')
      .filter(b => ['chrome', 'firefox', 'safari', 'edge', 'opera'].some(name => b.startsWith(name)))
      .map(b => b.replace(' ', '')),
  });
}

function sw() {
  return gulp.src('client/js/sw.js')
    .pipe(replace('let version;', 'let version = ' + Date.now() + ';'))
    .pipe(gulpTerser())
    .pipe(gulp.dest('./dist'));
}

function version() {
  return gulp.src('client/js/version.json')
    .pipe(replace('""', '"' + Date.now() + '"'))
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

function styles() {
  return gulp.src('client/css/styles.css')
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dist'));
}

function clean() {
  return del(['./dist']);
}

function compress() {
  return gulp.src('dist/bundle.js')
    .pipe(gulpTerser())
    .pipe(gulp.dest('./dist'));
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
    gulp.parallel(scripts, sw, version, manifest, images),
    gulp.parallel(styles, compress),
    inline,
    cspHash,
    precompress
  )(cb);
}

gulp.task('build', build);

gulp.task('serve', serve);

gulp.task('default', serve, build);
