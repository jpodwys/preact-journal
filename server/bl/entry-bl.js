module.exports = function(Entry){
  var self = this;
  const fourOhFour = { status: 400, message: 'Timestamp is required.' };
  const fiveHundred = { status: 500, message: 'There was an error.' };

  self.getAllEntriesByOwnerId = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getAllEntriesByOwnerId(user.id).then(function (entries){
        if(entries && entries.rows) return resolve(entries.rows);
        return reject({status: 500, message: 'There was an error.'});
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.getUpdatesSinceTimestamp = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      if(!params.timestamp) return reject(fourOhFour);
      const timestamp = parseInt(params.timestamp, 10);
      Entry.getUpdatesSinceTimestamp(user.id, timestamp, user.deviceId).then(function (entries){
        if(!entries) return reject(fiveHundred);
        return resolve(entries);
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.getEntryById = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry || user.id !== entry.ownerId) return reject(fourOhFour);
        entry.isOwner = (user && user.id == entry.ownerId);
        delete entry.ownerId;
        return resolve(entry);
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.createEntry = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.createEntry(body, user.id, user.deviceId).then(function (entry){
        return resolve(entry.id);
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.updateEntry = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry || user.id !== entry.ownerId) return reject(fourOhFour);
        Entry.updateEntry(entryId, body, user.deviceId).then(function (response){
          return resolve();
        }, function (err){
          return reject(err);
        });
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.deleteEntry = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      var entryId = parseInt(params.id, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry || user.id !== entry.ownerId) return reject(fourOhFour);
        Entry.deleteEntry(params.id, user.deviceId).then(function (response){
          return resolve();
        }, function (err){
          return reject(err);
        });
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }

  self.getEntryCount = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getEntryCount().then(function (total){
        return resolve(total);
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }
}
