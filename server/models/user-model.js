module.exports = function(sequelize, Sequelize){
  return sequelize.define('User', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      unique: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING,
      unique: true
    },
    password: Sequelize.STRING,
    updatedAt: {
      type: Sequelize.DATE,
      field: 'updated_at'
    }
  }, {timestamps: false});
}
