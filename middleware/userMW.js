var handlers = require('./user-handlers');

module.exports = function(sequelize, Sequelize) {
  var userModel = require('../models/user-model')(sequelize, Sequelize),
    userService = new (require('../services/user-service'))(userModel, sequelize),
    userBl = new (require('../bl/user-bl'))(userService),
    user = new (require('../middleware/service-wrapper'))(userBl);

  return user;
}
