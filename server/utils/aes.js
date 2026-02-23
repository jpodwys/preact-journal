var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  IV_LENGTH = 16;

function getKey() {
  var raw = process.env.AES_KEY;
  return crypto.createHash('sha256').update(raw).digest();
}

exports.encrypt = function(text){
  var iv = crypto.randomBytes(IV_LENGTH);
  var cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return iv.toString('hex') + ':' + crypted;
}

exports.decrypt = function(text){
  // Support legacy format (no IV prefix) for existing cookies
  if(text.indexOf(':') === -1){
    var legacyCipher = crypto.createDecipher(algorithm, process.env.AES_KEY);
    var legacyDec = legacyCipher.update(text, 'hex', 'utf8');
    legacyDec += legacyCipher.final('utf8');
    return legacyDec;
  }
  var parts = text.split(':');
  var iv = Buffer.from(parts[0], 'hex');
  var encrypted = parts[1];
  var decipher = crypto.createDecipheriv(algorithm, getKey(), iv);
  var dec = decipher.update(encrypted, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
