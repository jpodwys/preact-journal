// server/middleware/precompressed-static.js on a real express app and real HTTP. node:test, no dependencies.
//   node --test test/server/precompressed-static.spec.js        (npm run test:server)
// The CSP middleware is stubbed (it reads dist/csp-hash.json at load); everything else is the real middleware.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const CSP = "default-src 'self'";
const cspPath = require.resolve('../../server/middleware/csp.js');
require.cache[cspPath] = { id: cspPath, filename: cspPath, loaded: true, exports: res => res.header('Content-Security-Policy', CSP) };
const precompressedStatic = require('../../server/middleware/precompressed-static.js');
const express = require('express');

const HTML_V1 = '<html><body>' + 'journal '.repeat(500) + '</body></html>';
const br = s => zlib.brotliCompressSync(Buffer.from(s));

let dir, server, port;
const writeBr = (name, text) => fs.writeFileSync(path.join(dir, name + '.br'), br(text));

// Raw request: http.request does not decompress, so the body is the bytes that went over the wire.
function get (urlPath, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers: { 'accept-encoding': 'gzip, deflate, br', ...headers } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'precompressed-'));
  writeBr('index.html', HTML_V1);
  writeBr('app.css', 'body{color:red}'.repeat(200));
  fs.writeFileSync(path.join(dir, 'index.html'), HTML_V1);           // the uncompressed original, as dist/ has it
  const app = express();
  app.use(precompressedStatic(dir));
  app.use((req, res) => res.status(200).send('FELL THROUGH'));
  await new Promise(r => { server = app.listen(0, '127.0.0.1', r); });
  port = server.address().port;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

describe('precompressed html', () => {
  test('serves the .br with a strong content ETag, revalidation, vary and the CSP', async () => {
    const r = await get('/');
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(r.headers['content-encoding'], 'br');
    assert.equal(r.headers['vary'], 'Accept-Encoding');
    assert.match(r.headers['etag'], /^"[\w-]{10}"$/, 'short strong ETag (no W/ prefix)');
    assert.equal(r.headers['cache-control'], 'no-cache');
    assert.equal(r.headers['content-security-policy'], CSP);
    assert.equal(Number(r.headers['content-length']), r.body.length);
    assert.equal(zlib.brotliDecompressSync(r.body).toString(), HTML_V1);
  });

  test('a matching If-None-Match gets a 304 with headers only (no body, no encoding, no length)', async () => {
    const { headers } = await get('/');
    const r = await get('/', { 'if-none-match': headers.etag });
    assert.equal(r.status, 304);
    assert.equal(r.body.length, 0);
    assert.equal(r.headers['etag'], headers.etag);
    assert.equal(r.headers['cache-control'], 'no-cache');
    assert.equal(r.headers['vary'], 'Accept-Encoding');
    assert.equal(r.headers['content-encoding'], undefined);
    assert.equal(r.headers['content-length'], undefined);
  });

  test('weak form, a list, and * all match; a different tag does not', async () => {
    const { headers } = await get('/');
    assert.equal((await get('/', { 'if-none-match': 'W/' + headers.etag })).status, 304);
    assert.equal((await get('/', { 'if-none-match': '"nope", ' + headers.etag })).status, 304);
    assert.equal((await get('/', { 'if-none-match': '*' })).status, 304);
    assert.equal((await get('/', { 'if-none-match': '"nope"' })).status, 200);
  });

  test('a hard reload (Cache-Control: no-cache from the browser) always gets the full page', async () => {
    const { headers } = await get('/');
    const r = await get('/', { 'if-none-match': headers.etag, 'cache-control': 'no-cache' });
    assert.equal(r.status, 200);
    assert.ok(r.body.length > 0);
  });

  test('the ETag follows the content, not the mtime', async () => {
    const before = (await get('/')).headers.etag;

    const later = new Date(Date.now() + 60000);                       // a redeploy: same bytes, new mtime
    fs.utimesSync(path.join(dir, 'index.html.br'), later, later);
    assert.equal((await get('/')).headers.etag, before, 'same content, new mtime: same ETag');

    writeBr('index.html', HTML_V1.replace('journal', 'journals'));    // a real change
    const after = (await get('/')).headers.etag;
    assert.notEqual(after, before, 'new content: new ETag');
    assert.equal((await get('/', { 'if-none-match': before })).status, 200, 'the old tag no longer matches');

    writeBr('index.html', HTML_V1);                                   // restore for the other tests
  });

  test('HEAD sends the headers with no body, and honours If-None-Match', async () => {
    const h = await get('/', {}, 'HEAD');
    assert.equal(h.status, 200);
    assert.equal(h.body.length, 0);
    assert.ok(h.headers.etag);
    assert.equal((await get('/', { 'if-none-match': h.headers.etag }, 'HEAD')).status, 304);
  });

  test('a client that does not accept br falls through to the next handler', async () => {
    const r = await get('/', { 'accept-encoding': 'gzip, deflate' });
    assert.equal(r.body.toString(), 'FELL THROUGH');
  });
});

describe('other precompressed types', () => {
  test('get an ETag and 304 too, but no forced revalidation header', async () => {
    const r = await get('/app.css');
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-type'], 'text/css; charset=utf-8');
    assert.equal(r.headers['content-security-policy'], undefined);
    assert.equal(r.headers['cache-control'], undefined);
    assert.equal((await get('/app.css', { 'if-none-match': r.headers.etag })).status, 304);
  });

  test('unknown files and traversal attempts fall through', async () => {
    assert.equal((await get('/missing.css')).body.toString(), 'FELL THROUGH');
    assert.equal((await get('/..%2f..%2fetc%2fpasswd.txt')).body.toString(), 'FELL THROUGH');
  });
});
