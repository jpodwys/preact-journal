const { resolve } = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const dist = resolve('dist');

module.exports = {
  entry: './client/js/index.js',
  module: {
    rules: [
      {
        test: /\.jsx?/i,
        exclude: /node_modules/,
        loader: 'babel-loader',
      }
    ],
    loaders: [
      {
        test: /\.jsx?/i,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: [
            ['env', {
              'targets': {
                'browsers': [
                  'last 2 Chrome versions',
                  'last 2 Firefox versions',
                  'last 2 Safari versions',
                  'last 2 Edge versions',
                  'last 2 iOS versions',
                  'last 2 ChromeAndroid versions'
                ]
              }
            }],
            'stage-0'
          ]
        }
      }
    ]
  },
  plugins: [
    new UglifyJSPlugin()
  ],
  output: {
    filename: 'bundle.js',
    path: dist
  }
}
