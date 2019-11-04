module.exports = function(sequelize, Sequelize){
  return sequelize.define('Media', {
    id: {
      type: Sequelize.STRING(30),
      primaryKey: true,
      unique: true,
      field: 'public_id'
    },
    entryId: {
        type: Sequelize.INTEGER(11),
        field: 'entry_id',
        references: 'entries',
        referencesKey: 'id'
    },
    updatedAt: {
      type: Sequelize.INTEGER(15),
      field: 'updated_at'
    }
  }, {timestamps: false});
}
