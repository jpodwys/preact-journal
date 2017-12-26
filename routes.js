var Sequelize = require('sequelize'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  entry = require('./middleware/entryMW')(db, Sequelize),
  fs = require('fs');

module.exports = function(app){
  app.post('/api/user/authenticate', user.attemptLogin);
  app.post('/api/user', user.createAccount);
  // app.put('/user/:id');
  // app.delete('/user/:id')
  app.get('/api/entries', app.restrict, entry.getEntries);
  app.get('/api/entry/:id', entry.getEntryById);
  app.post('/api/entry', app.restrict, entry.createEntry);
  app.patch('/api/entry/:id', app.restrict, entry.updateEntry);
  app.delete('/api/entry/:id', app.restrict, entry.deleteEntry);

  /* Routes only accessible via AJAX calls */
  app.get('/api/getAllEntryIdsByOwnerId', app.restrict, entry.getAllEntryIdsByOwnerId);
  app.get('/api/getAllEntriesByOwnerId', app.restrict, entry.getAllEntriesByOwnerId);

  /* Convenience routes for development and metrics */
  app.get('/baseline', function (req, res){ res.send(200); });
  app.get('/user-count', user.getUserCount);
  app.get('/entry-count', entry.getEntryCount);

  app.get('/*', function(req, res){
    res.sendFile('index.html', {root: './dist', maxAge: 2592000});
  });
}
