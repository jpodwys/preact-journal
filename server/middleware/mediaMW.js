module.exports = function(sequelize, Sequelize){
  var mediaModel = require('../models/media-model')(sequelize, Sequelize),
    entryModel = require('../models/entry-model')(sequelize, Sequelize),
    mediaService = new (require('../services/media-service'))(mediaModel, sequelize),
    entryService = new (require('../services/entry-service'))(entryModel, sequelize),
    mediaBl = new (require('../bl/media-bl'))(mediaService, entryService),
    media = new (require('./service-wrapper'))(mediaBl);
  return media;
}
