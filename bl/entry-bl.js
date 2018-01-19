module.exports = function(Entry){
  var self = this;

  self.getAllEntriesByOwnerId = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getAllEntriesByOwnerId(user.id).then(function (entries){
        if(entries && entries.rows) return resolve(entries.rows);
        return reject({status: 500, message: 'There was an error.'});
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getUpdatesSinceTimestamp = function({body, query, user}){
    return new Promise(function (resolve, reject){
      if(!query.timestamp) return reject({status: 400, message: 'Timestamp is required.'});
      Entry.getUpdatesSinceTimestamp(user.id, parseInt(query.timestamp, 10), user.deviceId).then(function (entries){
        if(!entries) return reject({status: 500, message: 'There was an error.'});
        return resolve(entries);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getEntryById = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry) return reject({status: 404, message: 'Entry not found.'});
        if(!entry.isPublic && (!user || (user.id !== entry.ownerId))){
          return reject({status: 404, message: 'Entry not found.'});
        }
        entry.isOwner = (user && user.id == entry.ownerId);
        delete entry.ownerId;
        return resolve(entry);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.createEntry = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.createEntry(body, user.id, user.deviceId).then(function (entry){
        return resolve(entry.id);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.updateEntry = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry) return reject({status: 404, message: 'Entry not found.'});
        if(user.id !== entry.ownerId) return reject({status: 404, message: 'Entry not found.'});
        Entry.updateEntry(entryId, body, user.deviceId).then(function (response){
          return resolve();
        }, function (err){
          return reject(err);
        });
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.deleteEntry = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry) return reject({status: 404, message: 'Entry not found.'});
        if(user.id !== entry.ownerId) return reject({status: 404, message: 'Entry not found.'});
        Entry.deleteEntry(params.id, user.deviceId).then(function (response){
          return resolve();
        }, function (err){
          return reject(err);
        });
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getEntryCount = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getEntryCount().then(function (total){
        return resolve(total);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }
}
