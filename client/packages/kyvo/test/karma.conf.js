module.exports = function (config) {
  config.set({
    basePath: '.',
    files: ['bundle.spec.js'],
    frameworks: ['mocha', 'chai'],
    browsers: ['ChromeHeadless'],
    reporters: ['mocha'],
    singleRun: true
  });
};
