var jwt = require('jsonwebtoken'),
  AES = require('../utils/aes');

var loginOrCreate = function(req, res, user) {
  var expiration = (new Date((new Date()).getTime() + (60 * 60 * 1000 * 24 * 30))); // One month
  var token = jwt.sign(user, process.env.JWT_KEY, {expiresIn: '30d'});
  if(user.id) delete user.id;
  // This cookie proves a user is logged in and contains JWT claims
  res.cookie('auth_token', AES.encrypt(token), {
    httpOnly: (process.env.NODE_ENV === 'production'),
    secure: (process.env.NODE_ENV === 'production'),
    expires: expiration
  });
  // This cookie contains no data. It is solely for the client to
  // determine things about the UI since the auth_token cookie
  // is not accessible to a browser's JavaScript.
  res.cookie('logged_in', 'true', {
    secure: (process.env.NODE_ENV === 'production'),
    expires: expiration
  });

  res.sendStatus(204);
};

exports.attemptLogin = loginOrCreate;

exports.createAccount = loginOrCreate;

exports.getUserCount = function(req, res, total) {
  res.send({userCount: total});
}
