const path = require('path');

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
    reporters: [ 'progress', 'coverage-istanbul' ],

    coverageIstanbulReporter: {
      reports: ['text', 'html' ],
      // fixWebpackSourcePaths: true
    }
  });
};
