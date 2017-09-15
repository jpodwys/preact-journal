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
  plugins: [
    new UglifyJSPlugin()
  ],
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  }
}
