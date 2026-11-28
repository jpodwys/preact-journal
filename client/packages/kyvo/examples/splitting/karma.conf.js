module.exports = function (config) {
  config.set({
    basePath: '.', files: ['test/bundle.spec.js'], frameworks: ['mocha', 'chai', 'sinon'],
    browsers: ['ChromeHeadless'], reporters: ['mocha'], singleRun: true
  });
};
