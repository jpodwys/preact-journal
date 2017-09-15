module.exports = {
  entry: './assets/js/index.js',
  module: {
    rules: [
      {
        test: /\.jsx?/i,
        loader: 'babel-loader',
        options: {
          presets: ['env'],
          plugins: [
            ['transform-react-jsx', { pragma: 'h' }]
          ]
        }
      }
    ]
  },
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  }
}
