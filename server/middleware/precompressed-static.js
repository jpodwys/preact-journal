var fs = require('fs');
var path = require('path');

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.txt':  'text/plain; charset=utf-8'
};

module.exports = function precompressedStatic(rootDir) {
  var absRoot = path.resolve(rootDir);

  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    var accept = req.headers['accept-encoding'] || '';
    if (!/\bbr\b/.test(accept)) return next();

    var urlPath = req.path === '/' ? '/index.html' : req.path;
    var ext = path.extname(urlPath).toLowerCase();
    if (!TYPES[ext]) return next();

    var absFile = path.resolve(absRoot, '.' + urlPath);
    if (absFile !== absRoot && absFile.indexOf(absRoot + path.sep) !== 0) return next();

    var brPath = absFile + '.br';
    fs.stat(brPath, function (err, stat) {
      if (err || !stat.isFile()) return next();

      res.setHeader('Content-Type', TYPES[ext]);
      res.setHeader('Content-Encoding', 'br');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Vary', 'Accept-Encoding');

      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(brPath).pipe(res);
    });
  };
};
