var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var applyCsp = require('./csp');

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.txt':  'text/plain; charset=utf-8'
};

// ETags are a hash of the file's CONTENT, not its mtime: every deploy rebuilds dist/, so mtimes change on
// every deploy even when a file did not, and a content hash lets an unchanged file keep answering 304.
// Hashed once per file version (keyed by size and mtime), so a request costs a stat.
var etags = {};
function etagOf(file, stat, done) {
  var known = etags[file];
  if (known && known.size === stat.size && known.mtimeMs === stat.mtimeMs) return done(null, known.etag);
  fs.readFile(file, function (err, buf) {
    if (err) return done(err);
    var etag = '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 10) + '"';
    etags[file] = { size: stat.size, mtimeMs: stat.mtimeMs, etag: etag };
    done(null, etag);
  });
}

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

      etagOf(brPath, stat, function (err, etag) {
        if (err) return next();

        res.setHeader('ETag', etag);
        res.setHeader('Vary', 'Accept-Encoding');
        // "no-cache" means store it, but check with the server before every use. The check is a conditional
        // request that answers 304 with headers only, so an unchanged page is never downloaded twice.
        if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
        if (req.fresh) { res.statusCode = 304; return res.end(); }

        res.setHeader('Content-Type', TYPES[ext]);
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Content-Length', stat.size);
        if (ext === '.html') applyCsp(res);

        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(brPath).pipe(res);
      });
    });
  };
};
