var Sequelize = require('sequelize'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  entry = require('./middleware/entryMW')(db, Sequelize);

module.exports = function(app){
  /* REST endpoints */
  app.post('/api/user/login', user.attemptLogin);
  app.post('/api/user/logout', app.restrict, function(req, res) {
    res.clearCookie('auth_token');
    res.clearCookie('logged_in');
    res.sendStatus(204);
  });
  app.post('/api/user', user.createAccount);
  // app.patch('/user/:id');
  // app.delete('/user/:id')
  app.get('/api/entries/sync/:timestamp', app.restrict, entry.getUpdatesSinceTimestamp);
  app.get('/api/entries', app.restrict, entry.getAllEntriesByOwnerId);
  // app.get('/api/entry/:id', app.restrict, entry.getEntryById);
  app.post('/api/entry', app.restrict, entry.createEntry);
  app.patch('/api/entry/:id', app.restrict, entry.updateEntry);
  app.delete('/api/entry/:id', app.restrict, entry.deleteEntry);

  /* Convenience routes for development and metrics */
  app.get('/baseline', function (req, res){ res.sendStatus(200); });
  app.get('/user-count', user.getUserCount);
  app.get('/entry-count', entry.getEntryCount);

  /* Catch-all view route */
  app.get('/*', function(req, res){
    res.sendFile('index.html', {root: './dist', maxAge: '30d'});
  });
}
