// require('babel-register');

module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    reporters: [ 'mocha', /*'progress',*/ 'coverage' ],
    browsers: [ 'ChromeHeadless' ],
    files: [ 'client/js/**/*.spec.js' ],
    preprocessors: { 'client/js/**/*.js': [ 'webpack', 'coverage' ] },
    /* Reporting is way off right now. */
    // coverageReporter: {
    //   reporters: [
    //     { type: 'text' },
    //     { type: 'html' }
    //   ]
    // }
  });
};
