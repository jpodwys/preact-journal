module.exports = function(sequelize, Sequelize){
  return sequelize.define('Entry', {
    id: {type: Sequelize.INTEGER, primaryKey: true, unique: true, autoIncrement: true},
    ownerId: {type: Sequelize.INTEGER, field: 'owner_id'},
    date: Sequelize.DATE,
    text: Sequelize.STRING,
    isPublic: {type: Sequelize.BOOLEAN, field: 'is_public'},
    // createdAt: {type: Sequelize.DATE, field: 'created_at'},
    updatedAt: {type: Sequelize.DATE, field: 'updated_at'}
  }, {timestamps: false});
}
