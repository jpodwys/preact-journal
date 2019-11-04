module.exports = function(sequelize, Sequelize){
  var entryModel = require('../models/entry-model')(sequelize, Sequelize),
    entryService = new (require('../services/entry-service'))(entryModel, sequelize),
    entryBl = new (require('../bl/entry-bl'))(entryService),
    entry = new (require('../middleware/service-wrapper'))(entryBl);
  return entry;
}
