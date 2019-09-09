module.exports = function(){
  // Keep the dyno awake when in production
  if(process.env.NODE_ENV === 'production'){
    var https = require('https');
    setInterval(function() {
      https.get('https://preact-journal.herokuapp.com');
    }, 900000); // Every 15 minutes
  }

  // On the 31st of the 7 months/year that have 31 days,
  // remove all entries marked as deleted in the database.
  // I wait 31+ days because I need to outlast a maximum
  // session lifetime which is currently 30 days.
  if(new Date().getDate() === 31){
    var Sequelize = require('sequelize'),
      db = require('./db')(Sequelize),
      entryModel = require('./models/entry-model')(db, Sequelize),
      entryService = new (require('./services/entry-service'))(entryModel, db);

    entryService.removeAllDeletedEntries();
  }
}
