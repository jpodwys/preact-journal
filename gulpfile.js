var gulp = require('gulp');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');
var rename = require('gulp-rename');
var webpack = require('gulp-webpack');
// var critical = require('critical');
var criticalCss = require('gulp-penthouse');

function scripts(cb) {
  return gulp.src('assets/js/index.js')
    .pipe(webpack(require('./webpack.config.babel.js')))
    .pipe(rename('bundle.js'))
    .pipe(gulp.dest('dist'));
}

function sw() {
  return gulp.src('assets/js/sw.js')
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
}

function styles() {
  return gulp.src('assets/css/styles.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist'));
}

// function styles() {
//   return gulp.src('dist/components.html')
//     .pipe(critical({
//       base: 'dist/',
//       dest: 'styles.css',
//       minify: true
//       css: ['assets/css/styles.css']}))
// }

// function styles() {
//   return gulp.src('assets/css/styles.css')
//     .pipe(criticalCss({
//       url: 'http://localhost:3000/critical',
//       out: 'dist/styles.css'
//     }));
// }

function images() {
  return gulp.src('assets/images/**.*')
    .pipe(gulp.dest('dist'));
}

function inline() {
  return gulp.src('assets/index.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(inlinesource({
      rootpath: __dirname + '/dist',
      compress: false
    }))
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
