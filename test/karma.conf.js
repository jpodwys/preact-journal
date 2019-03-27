module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ './test/index.js' ],
    preprocessors: { './test/index.js': 'webpack' },
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    browsers: [ 'ChromeHeadless', 'Firefox', 'Safari' ],
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
      reports: ['text', 'html' ]
    }
  });
};
