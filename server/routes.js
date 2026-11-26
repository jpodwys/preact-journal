var Sequelize = require('sequelize'),
  rateLimit = require('express-rate-limit'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  userHandlers = require('./middleware/user-handlers'),
  entry = require('./middleware/entryMW')(db, Sequelize),
  applyCsp = require('./middleware/csp');

var loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = app => {
  /* REST endpoints */
  app.post('/api/user/login', loginLimiter, user.attemptLogin);
  app.post('/api/user/logout', app.restrict, userHandlers.logout);
  // This endpoint does work, but I don't want it to be accessible any more
  // app.post('/api/user', user.createAccount);
  // app.patch('/user/:id');
  // app.delete('/user/:id')
  app.get('/api/entries/sync/:timestamp', app.restrict, entry.getUpdatesSinceTimestamp);
  app.get('/api/entries', app.restrict, entry.getAllEntriesByOwnerId);
  // app.get('/api/entry/:id', app.restrict, entry.getEntryById);
  app.post('/api/entry', app.restrict, entry.createEntry);
  app.patch('/api/entry/:id', app.restrict, entry.updateEntry);
  app.delete('/api/entry/:id', app.restrict, entry.deleteEntry);

  /* Convenience routes for development and metrics */
  // app.get('/baseline', (req, res) => res.sendStatus(200));
  // app.get('/user-count', user.getUserCount);
  // app.get('/entry-count', entry.getEntryCount);

  /* 404 for unmatched API routes */
  app.all('/api/*', (req, res) => res.sendStatus(404));

  /* Catch-all view route */
  app.get('/*', (req, res) => {
    applyCsp(res);
    // Always revalidated (ETag, answered 304 when unchanged), like the precompressed copy of this same page.
    // A max-age here would leave a client that cannot take brotli on a stale page for that long.
    res.sendFile('index.html', { root: './dist', headers: { 'Cache-Control': 'no-cache' } });
  });
}
