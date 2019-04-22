module.exports = function(){
  // Keep the dyno awake when in production
  if(process.env.NODE_ENV === 'production'){
    var https = require('https');
    setInterval(function() {
      https.get('https://preact-journal.herokuapp.com');
    }, 900000); // Every 15 minutes
  }

  // Remove all entries mark as deleted over 31 days ago
  var Sequelize = require('sequelize'),
    db = require('./db')(Sequelize),
    entryModel = require('./models/entry-model')(db, Sequelize),
    entryService = new (require('./services/entry-service'))(entryModel, db);

  entryService.removeAllDeletedEntries();
}
