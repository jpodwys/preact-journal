const jwtMW = require('express-jwt'),
  AES = require('../utils/aes');

module.exports = jwtMW({
  secret: process.env.JWT_KEY,
  algorithms: ['HS256'],
  credentialsRequired: false,
  getToken: (req) => {
    var userId = req.headers['x-user-id'];
    if(userId && !/^\d+$/.test(userId)) return null;
    var cookieName = userId ? 'auth_token_' + userId : 'auth_token';
    if(req.cookies && req.cookies[cookieName]){
      return AES.decrypt(req.cookies[cookieName]);
    }
    return null;
  }
});
