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
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  }
}



