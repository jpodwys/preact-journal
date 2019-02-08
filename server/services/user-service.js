module.exports = function(User, sequelize){
  var self = this;

  self.getUserById = function(id){
    return User.findOne({
      where: { id: id },
      attributes: ['id', 'username', 'password']
    });
  }

  self.getUserByUsername = function(username){
    return User.findOne({
      where: {username: username},
      attributes: ['id', 'username', 'password']
    });
  }

  self.createUser = function(data){
    return new Promise(function (resolve, reject){
      User.create(data).then(function (user){
        resolve(user);
      }, function (err){
        reject(err);
      });
    });
  }

  self.updateUser = function(data){
    // return User.update({
    //   username: data.username,
    //   password: data.password
    // }, {
    //   where: { id: data.id }
    // });
  }

  self.deleteUser = function(id){
    // return User.destroy({
    //   where: { id: id }
    // });
  }

  self.getUserCount = function(){
    return User.count();
  }
}
