var jwt = require('jsonwebtoken'),
  AES = require('../utils/aes'),
  date = require('../utils/date');

var loginOrCreate = function(req, res, user) {
  var expiration = date.getOneMonth();
  user.deviceId = date.getLastFiveFromTimestamp();
  jwt.sign(user, process.env.JWT_KEY, { expiresIn: '30d' }, function(err, token){
    // Something went wrong when signing the token
    if(err) return res.status(500).send(err);

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
  });
};

exports.attemptLogin = loginOrCreate;

exports.createAccount = loginOrCreate;

exports.logout = function(req, res) {
  res.clearCookie('auth_token');
  res.clearCookie('logged_in');
}

exports.getUserCount = function(req, res, total) {
  res.send({ userCount: total });
}
