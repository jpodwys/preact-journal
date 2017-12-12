const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './assets/js/index.js',
  module: {
    rules: [
      {
        test: /\.jsx?/i,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  },
  // plugins: [
  //   new UglifyJSPlugin({
  //     output: {
  //       comments: false
  //     },
  //     mangle: true,
  //     sourceMap: true,
  //     compress: {
  //       properties: true,
  //       keep_fargs: false,
  //       pure_getters: true,
  //       collapse_vars: true,
  //       warnings: false,
  //       screw_ie8: true,
  //       sequences: true,
  //       dead_code: true,
  //       drop_debugger: true,
  //       comparisons: true,
  //       conditionals: true,
  //       evaluate: true,
  //       booleans: true,
  //       loops: true,
  //       unused: true,
  //       hoist_funs: true,
  //       if_return: true,
  //       join_vars: true,
  //       cascade: true,
  //       drop_console: false,
  //       pure_funcs: [
  //         'classCallCheck',
  //         '_classCallCheck',
  //         '_possibleConstructorReturn',
  //         'Object.freeze',
  //         'invariant',
  //         'warning'
  //       ]
  //     }
  //   })
  // ],
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  }
}
