var gulp = require('gulp');
var babel = require('gulp-babel');
// var rollup = require('rollup-stream');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var pump = require('pump');
var cleanCSS = require('gulp-clean-css');
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');
var rename = require('gulp-rename');
var webpack = require('gulp-webpack');

function scripts() {
  return gulp.src('assets/js/index.js')
    .pipe(webpack())
    // Does babel go here?
    // .pipe(uglify())
    .pipe(rename('bundle.js'))
    .pipe(gulp.dest('dist'));
}

function sw() {
  return gulp.src('assets/js/sw.js')
    .pipe(gulp.dest('dist'));
}

function styles() {
  return gulp.src('assets/css/styles.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist'));
}

function images() {
  return gulp.src('assets/images/**.*')
    .pipe(gulp.dest('dist'));
}

function concat() {
  return gulp.src('assets/index.html')
    .pipe(inlinesource())
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('dist'));
}

// function watch() {
//   gulp.watch(paths.scripts.src, scripts);
//   gulp.watch(paths.styles.src, styles);
// }

// var build = gulp.series(gulp.parallel(scripts, styles), concat);

function build() {
  return gulp.series(gulp.parallel(scripts, sw, styles, images), concat)();
}

gulp.task('build', build);

gulp.task('default', build/*, watch*/);
