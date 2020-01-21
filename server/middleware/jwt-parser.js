const jwtMW = require('express-jwt'),
  AES = require('../utils/aes');

module.exports = jwtMW({
  secret: process.env.JWT_KEY,
  credentialsRequired: false,
  getToken: (req) => {
    if(req.cookies && req.cookies.auth_token){
      return AES.decrypt(req.cookies.auth_token);
    }
    return null;
  }
});
