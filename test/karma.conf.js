const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

// Read sw.js verbatim and inject it as a string literal into the test bundle
// via DefinePlugin. The SW spec evaluates this source inside a sandbox with
// stubbed `self` / `caches` / `fetch`, so production sw.js is unchanged.
const SW_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../client/js/sw.js'),
  'utf8'
);

module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ './test/index.js' ],
    preprocessors: { './test/index.js': 'webpack' },
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    browsers: [ 'ChromeHeadless' ],
    webpack: {
      module: {
        rules: [
          {
            test: /\.js$/,
            use: 'babel-loader',
            exclude: /node_modules/,
          },
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
      },
      plugins: [
        new webpack.DefinePlugin({
          SW_SOURCE: JSON.stringify(SW_SOURCE)
        })
      ]
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
