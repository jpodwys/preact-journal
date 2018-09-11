// require('babel-register');

module.exports = function(config) {
	config.set({
		basePath: '../',
		frameworks: [ 'mocha', 'chai', 'sinon' ],
		reporters: [ 'mocha' ],
		browsers: [ 'ChromeHeadless' ],
    files: [ 'client/js/**/*.spec.js' ],
		preprocessors: { 'client/js/**/*.js': [ 'webpack' ] }
	});
};
