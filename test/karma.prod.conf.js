// Runs the specs bundled by test/build-prod-tests.js (minified, production
// build options) in ChromeHeadless. No webpack, no coverage.
module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ './test/.prod/bundle.js' ],
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    // See karma.conf.js: Chrome otherwise throttles history.replaceState.
    browsers: [ 'ChromeHeadlessNoThrottle' ],
    customLaunchers: {
      ChromeHeadlessNoThrottle: { base: 'ChromeHeadless', flags: [ '--disable-ipc-flooding-protection' ] }
    },
    reporters: [ 'mocha' ]
  });
};
