// server/middleware/csp.js, the real policy. node:test, no dependencies.
//   node --test test/server/csp.spec.js        (npm run test:server)
// Only dist/csp-hash.json is stubbed, so this runs without a build.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const load = Module._load;
Module._load = function (request, ...rest) {
  return request.endsWith('csp-hash.json') ? { hashes: ['abc'] } : load.call(this, request, ...rest);
};
const applyCsp = require('../../server/middleware/csp.js');
Module._load = load;

test('forms may only submit to this origin (default-src does not cover form-action)', () => {
  const headers = {};
  applyCsp({ header: (name, value) => { headers[name] = value; } });
  assert.match(headers['Content-Security-Policy'], /(^|; )form-action 'self'(;|$)/);
});
