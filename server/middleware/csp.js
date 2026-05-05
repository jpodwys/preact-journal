var hashes = require('../../dist/csp-hash.json').hashes || [];
var scriptSrc = "'self'" + hashes.map(function (h) { return " 'sha256-" + h + "'"; }).join('');
var CSP = "default-src 'self'; script-src " + scriptSrc + "; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";

module.exports = function applyCsp(res) {
  res.header('Content-Security-Policy', CSP);
};
