require('dotenv').load();
var express = require('express'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  app = express(),
  strictTransportSecurity = require('./server/middleware/strict-transport-security'),
  forceSsl = require('force-ssl-heroku'),
  jwtMW = require('express-jwt'),
  AES = require('./server/utils/aes'),
  cron = require('./server/cron'),
  shrinkRay = require('shrink-ray-current');
  PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(forceSsl);
app.use(strictTransportSecurity);
app.use(shrinkRay({threshold: '1.4kb'}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
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
app.get('/icon-192x192.png', function(req, res, next){
  res.sendFile('icon-192x192.png', {root: './dist', maxAge: '30d'});
  next();
});
app.get('/icon-144.png', function(req, res, next){
  res.sendFile('icon-144.png', {root: './dist', maxAge: '30d'});
  next();
});
app.use(express.static('dist', {maxAge: '0h'}));
require('./server/middleware/app-middleware')(app);
require('./server/routes')(app);

app.listen(PORT);
cron();
