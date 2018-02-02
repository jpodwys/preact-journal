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

function scripts(cb) {
  return gulp.src('assets/js/index.js')
    .pipe(webpack(require('./webpack.config.babel.js')))
    // .pipe(babel({
    //   presets: [
    //     ['env', {
    //       'targets': {
    //         'browsers': [
    //           'last 2 Chrome versions',
    //           'last 2 Firefox versions',
    //           'last 2 Safari versions',
    //           'last 2 Edge versions',
    //           'last 2 iOS versions',
    //           'last 2 ChromeAndroid versions'
    //         ]
    //       }
    //     }],
    //     'stage-0'
    //   ]
    // }))
    // .pipe(uglify())
    .pipe(rename('bundle.js'))
    .pipe(gulp.dest('dist'));
}

function sw() {
  return gulp.src('assets/js/sw.js')
    // .pipe(babel({
    //   presets: ['@babel/env']
    // }))
    // .pipe(uglify())
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

function inline() {
  return gulp.src('assets/index.html')
    .pipe(inlinesource({
      rootpath: __dirname + '/dist',
      compress: false
    }))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('dist'));
}

// function watch() {
//   gulp.watch(paths.scripts.src, scripts);
//   gulp.watch(paths.styles.src, styles);
// }

// var build = gulp.series(gulp.parallel(scripts, styles), concat);

function build() {
  return gulp.series(gulp.parallel(scripts, sw, styles, images), inline)();
}

gulp.task('build', build);

gulp.task('default', build/*, watch*/);
