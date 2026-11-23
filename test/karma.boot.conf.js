const path = require('path');

// Own karma page for the bootstrap smoke test: client/js/index.js renders into
// document.body *on import*, so it must not share a page with other specs.
// Scenario is chosen with BOOT_SCENARIO=in|out (passed to the page as
// client.args). BOOT_ENTRY=<abs path> swaps the entry module for a temporary
// copy (used only to prove the test can fail).
module.exports = function(config) {
  const webpack = require('webpack');
  const scenario = process.env.BOOT_SCENARIO || 'in';
  const plugins = [];
  if(process.env.BOOT_ENTRY) {
    plugins.push(new webpack.NormalModuleReplacementPlugin(
      /client[\\/]js[\\/]index\.js$/,
      path.resolve(process.env.BOOT_ENTRY)
    ));
  }
  config.set({
    basePath: '../',
    files: [ './test/boot.spec.js' ],
    preprocessors: { './test/boot.spec.js': 'webpack' },
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    browsers: [ 'ChromeHeadless' ],
    client: { args: [ scenario ], mocha: { timeout: 5000 } },
    webpack: {
      module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: 'babel-loader',
              options: {
                babelrc: false,
                presets: ['@babel/preset-env'],
                plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }]]
              }
            },
            exclude: /node_modules/,
          }
        ]
      },
      plugins
    },
    reporters: [ 'mocha' ]
  });
};
