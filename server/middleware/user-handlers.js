var jwt = require('jsonwebtoken'),
  AES = require('../utils/aes'),
  date = require('../utils/date');

function getCookieOpts () {
  return {
    httpOnly: (process.env.NODE_ENV === 'production'),
    secure: (process.env.NODE_ENV === 'production'),
    sameSite: 'strict',
    expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 90)) // 90 days
  };
}

var loginOrCreate = function(req, res, user) {
  user.deviceId = date.getLastFiveFromTimestamp();
  jwt.sign(user, process.env.JWT_KEY, { expiresIn: '90d' }, function(err, token){
    if(err) return res.status(500).send(err);

    var encrypted = AES.encrypt(token);
    var cookieOpts = getCookieOpts();

    res.cookie('auth_token_' + user.id, encrypted, cookieOpts);
    res.status(200).json({ id: user.id, username: user.username });
  });
};

exports.attemptLogin = loginOrCreate;

exports.createAccount = loginOrCreate;

exports.logout = function(req, res) {
  var userId = req.user && req.user.id;
  if(userId) res.clearCookie('auth_token_' + userId, getCookieOpts());
  res.sendStatus(204);
}

exports.getUserCount = function(req, res, total) {
  res.send({ userCount: total });
}
