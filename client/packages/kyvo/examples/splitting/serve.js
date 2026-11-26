// A static file server for the built example. Chunks are ES modules, which browsers refuse to load from file://,
// so the example needs one. It listens on loopback only.
//   node serve.js [port]      serve this folder (index.html + dist/) at http://127.0.0.1:8080
// Also used by the browser spec, which can make any URL fail to rehearse a chunk that did not arrive.
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

function createServer(dir, port = 0) {
  const requests = [], failing = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(dir, url === '/' ? 'index.html' : url);
    const rule = failing.find(f => f.pattern.test(url));
    requests.push({ url, status: rule ? rule.status : 0 });
    if (rule) { res.writeHead(rule.status); return res.end(); }
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({
    origin: 'http://127.0.0.1:' + server.address().port,
    requests,
    fail: (pattern, status = 503) => { failing.push({ pattern, status }); },
    heal: () => { failing.length = 0; },
    close: () => new Promise(r => server.close(r))
  })));
}

module.exports = { createServer };

if (require.main === module) {
  createServer(__dirname, Number(process.argv[2]) || 8080).then(s => console.log('serving ' + s.origin + '  (node build.js app first)'));
}
