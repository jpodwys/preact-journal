const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

// Read sw.js verbatim and inject it as a string literal into the test bundle
// via DefinePlugin. The SW spec evaluates this source inside a sandbox with
// stubbed `self` / `caches` / `fetch`, so production sw.js is unchanged.
const SW_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../client/js/sw.js'),
  'utf8'
);

// SPECS=components/entry,js/utils runs only the spec files under those paths
// (relative to client/; a path may also be one .spec.js file) through a temp
// entry file, so work in progress elsewhere cannot break the run. Unset = all.
function specEntry () {
  if(!process.env.SPECS) return './test/index.js';
  const root = path.resolve(__dirname, '../client');
  const walk = p => fs.statSync(p).isDirectory()
    ? fs.readdirSync(p).flatMap(n => walk(path.join(p, n)))
    : /\.spec\.js$/.test(p) ? [p] : [];
  const files = process.env.SPECS.split(',').flatMap(s => walk(path.join(root, s.trim())));
  const entry = path.join(__dirname, '.entry-' + process.pid + '.js');
  fs.writeFileSync(entry, files.map(f => `import ${JSON.stringify(f)};`).join('\n') + '\n');
  process.on('exit', () => { try { fs.unlinkSync(entry); } catch (e) {} });
  return './test/' + path.basename(entry);
}
const ENTRY = specEntry();

module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [ ENTRY ],
    preprocessors: { [ENTRY]: 'webpack' },
    frameworks: [ 'mocha', 'chai', 'sinon' ],
    // Chrome silently ignores history.pushState/replaceState after ~200 calls
    // in 10s ("Throttling navigation to prevent the browser from hanging"),
    // which the full suite exceeds; route() assertions then see a stale URL.
    browsers: [ 'ChromeHeadlessNoThrottle' ],
    customLaunchers: {
      ChromeHeadlessNoThrottle: { base: 'ChromeHeadless', flags: [ '--disable-ipc-flooding-protection' ] }
    },
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
          },
          {
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: { esModules: true }
            },
            enforce: 'post',
            exclude: /node_modules|\/test|\.spec\.js$/,
          }
        ]
      },
      plugins: [
        new webpack.DefinePlugin({
          SW_SOURCE: JSON.stringify(SW_SOURCE)
        })
      ]
    },
    client: { mocha: { grep: process.env.GREP || undefined } },
    reporters: [ 'mocha' ],
    coverageIstanbulReporter: {
      reports: ['text', 'html' ],
      // fixWebpackSourcePaths: true
    },
    /* This doesn't seem to do anything right now. */
    // thresholds: {
    //   emitWarning: false,
    //   global: {
    //     statements: 90,
    //     lines: 90,
    //     branches: 80,
    //     functions: 90
    //   },
    //   each: {
    //     statements: 90,
    //     lines: 90,
    //     branches: 50, // :(
    //     functions: 90
    //   }
    // }
  });
};
