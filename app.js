require('dotenv').load();
var express = require('express'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  app = express(),
  strictTransportSecurity = require('./server/middleware/strict-transport-security'),
  forceSsl = require('force-ssl-heroku'),
  jwtPrser = require('./server/middleware/jwt-parser'),
  cron = require('./server/cron'),
  // Can't use shrinkRay any more because it relies on
  // a brotli library that uses an old version of python
  // which gyp and therefore heroku don't support.
  // This means the app's download size is significantly larger.
  // But this is the price I have to pay for now to get this deployable again.
  // shrinkRay = require('shrink-ray');
  compression = require('compression'),
  PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(forceSsl);
app.use(strictTransportSecurity);
// app.use(shrinkRay({ threshold: '1.4kb' }));
app.use(compression({ threshold: '1.4kb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(jwtPrser);
app.use(express.static('dist', { maxAge: '0h' }));
require('./server/middleware/app-middleware')(app);
require('./server/routes')(app);

app.listen(PORT);
cron();
