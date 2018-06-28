module.exports = function(sequelize, Sequelize){
  return sequelize.define('Entry', {
    id: {type: Sequelize.INTEGER(11), primaryKey: true, unique: true, autoIncrement: true},
    ownerId: {type: Sequelize.INTEGER(11), field: 'owner_id'},
    date: Sequelize.DATE,
    text: Sequelize.TEXT,
    isPublic: {type: Sequelize.BOOLEAN, field: 'is_public'},
    updatedAt: {type: Sequelize.INTEGER(15), field: 'updated_at'},
    deleted: Sequelize.BOOLEAN,
    deviceId: {type: Sequelize.STRING(5), field: 'device_id'},
  }, {timestamps: false});
}
