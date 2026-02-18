var Sequelize = require('sequelize'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  userHandlers = require('./middleware/user-handlers'),
  entry = require('./middleware/entryMW')(db, Sequelize),
  version = require('../dist/version.json').version;

module.exports = app => {
  /* REST endpoints */
  app.post('/api/user/login', user.attemptLogin);
  app.post('/api/user/logout', app.restrict, userHandlers.logout);
  app.post('/api/user/switch', userHandlers.switchAccount);
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
  app.get('/baseline', (req, res) => res.sendStatus(200));
  app.get('/user-count', user.getUserCount);
  app.get('/entry-count', entry.getEntryCount);

  /* App version so ServiceWorker knows whether to refresh assets */
  app.get('/version', (req, res) => res.send({ version }));

  /* Catch-all view route */
  app.get('/*', (req, res) => {
    res.sendFile('index.html', { root: './dist', maxAge: '30d' });
  });
}
