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
var del = require('del');
var replace = require('gulp-replace');

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
  var match = html.match(/<script>([\s\S]*?)<\/script>/);
  var hash = match ? crypto.createHash('sha256').update(match[1]).digest('base64') : '';
  fs.writeFileSync('./dist/csp-hash.json', JSON.stringify({ hash: hash }));
  cb();
}

function build(cb) {
  return gulp.series(
    clean,
    gulp.parallel(scripts, sw, version, manifest, images),
    gulp.parallel(styles, compress),
    inline,
    cspHash
  )(cb);
}

gulp.task('build', build);

gulp.task('serve', serve);

gulp.task('default', serve, build);
