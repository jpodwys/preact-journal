const { resolve } = require('path');
// const HTML = require('html-webpack-plugin');
// const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
// const WebpackCritical = require('webpack-critical');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
// const ExtractTextPlugin = require('extract-text-webpack-plugin');

const dist = resolve('dist');

module.exports = {
  entry: './assets/js/index.js',
  // [
  //   './assets/js/index.js',
  //   './assets/css/master-styles.css'
  // ],
  module: {
    rules: [
      {
        test: /\.jsx?/i,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      // {
      //   test: /\.css$/,
      //   use: ExtractTextPlugin.extract({
      //     use: 'css-loader?importLoaders=1',
      //   }),
      // }
    ]
  },
  plugins: [
    new UglifyJSPlugin(),
    // new HTML({
    //   title: 'Journalize',
    //   filename: __dirname + '/dist/index.html',
    //   files: {
    //     // css: ['assets/css/master-styles.css'],
    //     js: ['dist/bundle.js']
    //   },
    //   minify: {
    //     minifyCSS: true,
    //     minifyJS: true
    //   },
    //   // inlineSource: '.(js|css)$'
    // }),
    // new HtmlWebpackInlineSourcePlugin(),
    // new ExtractTextPlugin({
    //   filename: './bundle.css',
    //   allChunks: true,
    // }),
    // new WebpackCritical({
    //   context: dist,
    //   stylesheet: 'master-styles.css'
    // }),
  ],
  output: {
    filename: 'bundle.js',
    path: dist
  }
}
