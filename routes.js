var Sequelize = require('sequelize'),
  db = require('./db')(Sequelize),
  user = require('./middleware/userMW')(db, Sequelize),
  entry = require('./middleware/entryMW')(db, Sequelize),
  fs = require('fs');

module.exports = function(app){
  /* Main routes--accessible via both form submission and AJAX calls */
  // app.get('/', handlers.getIndex, handlers.execute);
  app.post('/user/authenticate', user.attemptLogin);
  app.post('/user', user.createAccount);
  // app.put('/user/:id');
  // app.delete('/user/:id')
  app.get('/entries', app.restrict, entry.getEntries);
  app.get('/entry/:id', entry.getEntryById);
  app.post('/entry', app.restrict, entry.createEntry);
  app.put('/entry/:id', app.restrict, entry.updateEntry);
  app.delete('/entry/:id', app.restrict, entry.deleteEntry);

  /* Routes only accessible via AJAX calls */
  app.get('/getAllEntryIdsByOwnerId', app.restrict, entry.getAllEntryIdsByOwnerId);

  /* Convenience routes for development and metrics */
  app.get('/baseline', function (req, res){ res.send(200); });
  app.get('/user-count', user.getUserCount);
  app.get('/entry-count', entry.getEntryCount);
}
