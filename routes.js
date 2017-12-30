var Sequelize = require('sequelize'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  entry = require('./middleware/entryMW')(db, Sequelize),
  fs = require('fs');

module.exports = function(app){
  /* REST endpoints */
  app.post('/api/user/authenticate', user.attemptLogin);
  app.post('/api/user', user.createAccount);
  // app.put('/user/:id');
  // app.delete('/user/:id')
  app.get('/api/entries/sync', app.restrict, entry.getUpdatesSinceTimestamp);
  app.get('/api/entries', app.restrict, entry.getAllEntriesByOwnerId);
  app.get('/api/entry/:id', entry.getEntryById);
  app.post('/api/entry', app.restrict, entry.createEntry);
  app.patch('/api/entry/:id', app.restrict, entry.updateEntry);
  app.delete('/api/entry/:id', app.restrict, entry.deleteEntry);

  /* Convenience routes for development and metrics */
  app.get('/baseline', function (req, res){ res.send(200); });
  app.get('/user-count', user.getUserCount);
  app.get('/entry-count', entry.getEntryCount);

  /* Catch-all view route */
  app.get('/*', function(req, res){
    res.sendFile('index.html', {root: './dist', maxAge: '30d'});
  });
}
