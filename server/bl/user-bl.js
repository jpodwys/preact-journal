var bcrypt = require('bcryptjs');

module.exports = function(User){
  var self = this;

  self.attemptLogin = function({body}){
    return new Promise(function (resolve, reject){
      User.getUserByUsername(body.username).then(function (user){
        if(!user) return reject({status: 400, message: 'Invalid username/password combination'});
        bcrypt.compare(body.password, user.password, function (err, res){
          if(err) return reject({status: 500, message: err});
          if(!res) return reject({status: 400, message: 'Invalid username/password combination'});
          var output = {id: user.id, username: user.username};
          return resolve(output);
        });
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.logout = function(){

  }

  self.createAccount = function({body}){
    var user = body;
    return new Promise(function (resolve, reject){
      if(!body.username || !body.password) reject({status: 400, message: 'Username and password are both required'});
      // if(!) username and password should both be several characters minimum
      User.getUserByUsername(body.username).then(function (user){
        if(user) return reject({status: 400, message: 'Username ' + body.username + ' is taken. Please try another.'});
        bcrypt.genSalt(10, function (err, salt){
          bcrypt.hash(body.password, salt, function (err, hash){
            var userData = {username: body.username, password: hash};
            User.createUser(userData).then(function (user){
              if(!user) return reject({status: 500, message: 'Failed to created account'});
              var output = {id: user.id, username: user.username};
              return resolve(output);
            }, function (err){
              return reject({status: 500, message: err});
            });
          });
        });
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.updateAccount = function({body, query, user}){
    // Make sure the current user is the correct user
    // return User.update(
    //   {
    //     username: body.username,
    //     password: body.password
    //   },{
    //     where: {id: body.id}
    //   }
    // );
  }

  self.deleteAccount = function({body, query, user}){
    // Make sure the current user is the correct user
    // return User.destroy({
    //   where: {id: body.id}
    // });
  }

  self.getUserCount = function(){
    return new Promise(function (resolve, reject){
      User.getUserCount().then(function (total){
        return resolve(total);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }
}
