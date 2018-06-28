var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  key = process.env.AES_KEY;

exports.encrypt = function(text){
  var cipher = crypto.createCipher(algorithm, key);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}
 
exports.decrypt = function(text){
  var decipher = crypto.createDecipher(algorithm, key);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
