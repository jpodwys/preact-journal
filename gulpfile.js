require('dotenv').load();
var gulp = require('gulp');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');
var rename = require('gulp-rename');
var webpack = require('gulp-webpack');
var del = require('del');
var replace = require('gulp-replace');

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

function sw() {
  return gulp.src('assets/js/sw.js')
    .pipe(replace('let version;', 'let version = ' + Date.now() + ';'))
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

function manifest() {
  return gulp.src('assets/manifest.json')
    .pipe(gulp.dest('./dist'));
}

function styles() {
  return gulp.src('assets/css/styles.css')
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dist'));
}

function clean() {
  return del(['./dist']);
}

function inline() {
  return gulp.src('assets/index.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyCSS: true
    }))
    .pipe(inlinesource({
      rootpath: __dirname + '/dist',
      compress: false
    }))
    .pipe(gulp.dest('./dist'));
}

function build() {
  return gulp.series(
    clean,
    serve,
    gulp.parallel(scripts, sw, manifest, images),
    styles,
    inline
  )();
}

// gulp.task('build', build);

// gulp.task('serve', serve);

gulp.task('default', build/*, watch*/);
