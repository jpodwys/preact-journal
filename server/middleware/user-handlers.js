var jwt = require('jsonwebtoken'),
  AES = require('../utils/aes'),
  date = require('../utils/date');

function getCookieOpts () {
  return {
    httpOnly: (process.env.NODE_ENV === 'production'),
    secure: (process.env.NODE_ENV === 'production'),
    expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 90)) // One month
  };
}

var loginOrCreate = function(req, res, user) {
  user.deviceId = date.getLastFiveFromTimestamp();
  jwt.sign(user, process.env.JWT_KEY, { expiresIn: '90d' }, function(err, token){
    if(err) return res.status(500).send(err);

    var encrypted = AES.encrypt(token);
    var cookieOpts = getCookieOpts();

    res.cookie('auth_token', encrypted, cookieOpts);
    res.cookie('auth_token_' + user.id, encrypted, cookieOpts);
    res.status(200).json({ id: user.id, username: user.username });
  });
};

exports.attemptLogin = loginOrCreate;

exports.createAccount = loginOrCreate;

exports.logout = function(req, res) {
  var userId = req.user && req.user.id;
  res.clearCookie('auth_token');
  if(userId) res.clearCookie('auth_token_' + userId);
  res.sendStatus(204);
}

exports.switchAccount = function(req, res) {
  var userId = req.body.userId;
  var cookie = req.cookies['auth_token_' + userId];

  if(!cookie) return res.sendStatus(401);

  try {
    var token = AES.decrypt(cookie);
    var decoded = jwt.verify(token, process.env.JWT_KEY);

    res.cookie('auth_token', cookie, getCookieOpts());
    res.status(200).json({ id: decoded.id, username: decoded.username });
  } catch(err) {
    res.sendStatus(401);
  }
}

exports.getUserCount = function(req, res, total) {
  res.send({ userCount: total });
}
