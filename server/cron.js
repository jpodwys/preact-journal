module.exports = function(){
  var Sequelize = require('sequelize'),
    db = require('./db')(Sequelize),
    entryModel = require('./models/entry-model')(db, Sequelize),
    entryService = new (require('./services/entry-service'))(entryModel, db);

  entryService.removeAllDeletedEntries();
}
