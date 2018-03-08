require('dotenv').load();
var express = require('express'),
  compress = require('compression'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  app = express(),
  strictTransportSecurity = require('./middleware/strict-transport-security'),
  forceSsl = require('force-ssl-heroku'),
  jwtMW = require('express-jwt'),
  resMods = require('./middleware/response-mods'),
  AES = require('./utils/aes'),
  PORT = process.env.PORT || 3000;

// Keep the dyno awake
// var http = require('http');
// setInterval(function() {
//   http.get('https://riot-demo.herokuapp.com');
// }, 900000); // Every 15 minutes

app.disable('x-powered-by');
app.use(forceSsl);
app.use(strictTransportSecurity);
app.use(compress({threshold: '1.4kb'}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
// app.use(resMods.vary);
app.use(jwtMW({
  secret: process.env.JWT_KEY,
  credentialsRequired: false,
  getToken: function(req){
    if(req.cookies && req.cookies.auth_token)
      return AES.decrypt(req.cookies.auth_token);
    return null;
  }
}));
app.get('/favicon.ico', function(req, res, next){
  res.sendFile('favicon.ico', {root: './dist', maxAge: '30d'});
  next();
});
app.use(express.static('dist', {maxAge: '0h'}));
require('./middleware/app-middleware')(app);
require('./routes')(app);

var server = app.listen(PORT);
