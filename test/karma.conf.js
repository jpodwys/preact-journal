const path = require('path');

module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ './test/index.js' ],
    preprocessors: { './test/index.js': 'webpack' },
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    browsers: [ 'ChromeHeadless' ],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
    webpack: {
      module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: { esModules: true }
            },
            enforce: 'post',
            exclude: /node_modules|\/test|\.spec\.js$/,
          }
        ]
      }
    },
    reporters: [ 'mocha', 'coverage-istanbul' ],
    coverageIstanbulReporter: {
      reports: ['text', 'html' ],
      // fixWebpackSourcePaths: true
    },
    /* This doesn't seem to do anything right now. */
    // thresholds: {
    //   emitWarning: false,
    //   global: {
    //     statements: 90,
    //     lines: 90,
    //     branches: 80,
    //     functions: 90
    //   },
    //   each: {
    //     statements: 90,
    //     lines: 90,
    //     branches: 50, // :(
    //     functions: 90
    //   }
    // }
  });
};
