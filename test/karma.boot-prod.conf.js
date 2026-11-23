// Loads the esbuild bundle of boot.spec.js (test/build-boot-prod.js). No webpack.
// Scenario via BOOT_SCENARIO=in|out, as in karma.boot.conf.js.
module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ './test/.prod-boot/bundle.js' ],
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    browsers: [ 'ChromeHeadless' ],
    client: { args: [ process.env.BOOT_SCENARIO || 'in' ], mocha: { timeout: 5000 } },
    reporters: [ 'mocha' ]
  });
};
