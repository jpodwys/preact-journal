// Dependency-free stand-in for the FRONT-END half of the real server
// (app.js + server/routes.js + server/middleware/{csp,precompressed-static}.js):
//   - serves built files from dist/ ; brotli .br variant when the client sends
//     `Accept-Encoding: br` and the file is html/js/css/json/svg/txt (as precompressed-static does)
//   - GET /version -> {version} from the artifact's own dist/version.json
//   - /api/* -> 404 (the browser-side interception answers these, never the server)
//   - SPA catch-all -> index.html with the CSP header built from the ARTIFACT'S
//     dist/csp-hash.json, exactly as server/middleware/csp.js does
//   - Cache-Control: catch-all `public, max-age=2592000` (30d), static files `public, max-age=0`
// NOT replicated: shrink-ray gzip, force-ssl/HSTS, cookies/JWT, helmet-style extras.
// Deliberate difference: the real express.static would serve `/` -> index.html
// WITHOUT a CSP when the client lacks `br`; here index.html always carries the CSP
// (browsers always send br in production over https, so that is the shipped behaviour).
const fs = require('fs');
const path = require('path');
const http = require('http');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon'
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

function findCspSource () {
  let dir = __dirname;
  while(true) {
    const p = path.join(dir, 'server/middleware/csp.js');
    if(fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if(up === dir) return null;
    dir = up;
  }
}

// Drift guard: the policy template below is a replica of server/middleware/csp.js.
// Fail loudly if the real file stops containing the pieces we replicate.
function assertCspTemplateMatchesServer () {
  const p = findCspSource();
  if(!p) throw new Error('drift guard: server/middleware/csp.js not found above ' + __dirname);
  const text = fs.readFileSync(p, 'utf8');
  const required = [
    `"'self'"`,
    `" 'sha256-" + h + "'"`,
    `"default-src 'self'; script-src " + scriptSrc + "; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"`,
    `res.header('Content-Security-Policy', CSP)`
  ];
  for(const piece of required) {
    if(!text.includes(piece)) throw new Error(`CSP drift: ${p} no longer contains ${piece}; update test/artifact/static-server.js`);
  }
}

function buildCsp (hashes) {
  const scriptSrc = "'self'" + hashes.map(h => " 'sha256-" + h + "'").join('');
  return "default-src 'self'; script-src " + scriptSrc + "; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
}

// opts.hashes overrides the artifact's csp-hash.json (mutation proofs only).
function createServer (distDir, opts = {}) {
  assertCspTemplateMatchesServer();
  const root = path.resolve(distDir);
  const hashes = opts.hashes || JSON.parse(fs.readFileSync(path.join(root, 'csp-hash.json'), 'utf8')).hashes || [];
  const csp = buildCsp(hashes);
  const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).version;
  const requests = [];

  function send (req, res, file, ext, extra = {}) {
    const accept = req.headers['accept-encoding'] || '';
    let src = file, enc = null;
    if(COMPRESSIBLE.has(ext) && /\bbr\b/.test(accept) && fs.existsSync(file + '.br')) { src = file + '.br'; enc = 'br'; }
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': fs.statSync(src).size, ...extra };
    if(enc) { headers['Content-Encoding'] = 'br'; headers['Vary'] = 'Accept-Encoding'; }
    if(ext === '.html') headers['Content-Security-Policy'] = csp;
    res.writeHead(200, headers);
    if(req.method === 'HEAD') return res.end();
    fs.createReadStream(src).pipe(res);
  }

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    requests.push({ method: req.method, path: u.pathname, acceptEncoding: req.headers['accept-encoding'] || '' });
    if(req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(404); return res.end(); }
    if(u.pathname === '/version') {
      const body = JSON.stringify({ version });
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Content-Length': Buffer.byteLength(body) });
      return res.end(body);
    }
    if(u.pathname.startsWith('/api/')) { res.writeHead(404); return res.end('Not Found'); }
    const rel = decodeURIComponent(u.pathname);
    const abs = path.resolve(root, '.' + rel);
    const ext = path.extname(abs).toLowerCase();
    if(rel !== '/' && abs.startsWith(root + path.sep) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return send(req, res, abs, ext, { 'Cache-Control': 'public, max-age=0' });
    }
    // SPA catch-all (including '/')
    send(req, res, path.join(root, 'index.html'), '.html', { 'Cache-Control': 'public, max-age=2592000' });
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server, port, csp, hashes, requests,
        origin: 'http://localhost:' + port,
        close: () => new Promise(r => { server.closeAllConnections && server.closeAllConnections(); server.close(() => r()); })
      });
    });
  });
}

module.exports = { createServer, buildCsp, assertCspTemplateMatchesServer };

if(require.main === module) {
  const { DIST } = require('./build-artifact');
  createServer(process.env.DIST || DIST).then(s => console.log('serving ' + s.origin + '\n' + s.csp));
}
