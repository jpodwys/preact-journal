require('dotenv').load();
var gulp = require('gulp');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');
var rename = require('gulp-rename');
var webpack = require('gulp-webpack');
var criticalCss = require('gulp-penthouse');
var del = require('del');
var PORT = process.env.PORT || 3000;
var LOCAL = process.env.NODE_ENV === 'production';
var CRITICAL_URL = process.env.NODE_ENV === 'production'
  ? 'https://preact-journal.herokuapp.com/critical'
  : 'http://localhost:' + PORT + '/critical';

function serve(cb) {
  require('./app.js');
  cb();
}

function scripts(cb) {
  return gulp.src('assets/js/index.js')
    .pipe(webpack(require('./webpack.config.babel.js')))
    .pipe(rename('bundle.js'))
    .pipe(gulp.dest('./dist'));
}

function criticalScripts(cb) {
  return gulp.src('assets/js/critical.js')
    .pipe(webpack(require('./webpack-critical.config.babel.js')))
    .pipe(rename('critical-bundle.js'))
    .pipe(gulp.dest('./dist'));
}

function sw() {
  return gulp.src('assets/js/sw.js')
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
}

function images() {
  return gulp.src('assets/images/**.*')
    .pipe(gulp.dest('./dist'));
}

function styles() {
  return gulp.src('assets/css/styles.css')
    .pipe(criticalCss({
      width: 768,
      height: 10000,
      keepLargerMediaQueries: true,
      url: CRITICAL_URL,
      pageLoadSkipTimeout: 5000,
      blockJSRequests: false,
      renderWaitTime: 1000,
      propertiesToRemove: [
        'pointer-events',
        '(-webkit-)?tap-highlight-color',
        '(.*)user-select'
      ],
      forceInclude: [
        '.search-icon:hover',
        '(.*)transition(.*)',
        'a:not(.pure-menu-link):hover',
        '.pure-menu-link:hover',
        '.pure-menu-link.active'
      ],
      out: 'styles.css'
    }))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('./dist'));
}

function moveStyles() {
  return gulp.src('cssstyles.css')
    .pipe(rename('styles.css'))
    .pipe(gulp.dest('./dist'));
}

function clean() {
  return del(['cssstyles.css']);
}

function inline() {
  return gulp.src('assets/index.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(inlinesource({
      rootpath: __dirname + '/dist',
      compress: false
    }))
    .pipe(gulp.dest('./dist'));
}

// function watch() {
//   gulp.watch(paths.scripts.src, scripts);
//   gulp.watch(paths.styles.src, styles);
// }

function build() {
  return gulp.series(
    serve,
    gulp.parallel(scripts, criticalScripts, sw, images),
    styles,
    moveStyles,
    gulp.parallel(clean, inline)
  )();
}

// gulp.task('build', build);

// gulp.task('serve', serve);

gulp.task('default', build/*, watch*/);
