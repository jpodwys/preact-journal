var cspHash = require('../../dist/csp-hash.json').hash;
var scriptSrc = cspHash
  ? "'self' 'sha256-" + cspHash + "'"
  : "'self'";

module.exports = function(req, res, next){
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.header('Content-Security-Policy', "default-src 'self'; script-src " + scriptSrc + "; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'");
  next();
}