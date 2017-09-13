var LIMIT = 10;

module.exports = function(Entry){
  var self = this;

  self.getEntries = function(data){
    if(data.query && data.query.q){
      return self.getEntriesByTextSearch(data);
    }
    else{
      return self.getEntriesByOwnerId(data);
    }
  }

  self.getEntriesByOwnerId = function({body, query, user}){
    return new Promise(function (resolve, reject){
      var offset = (query.p) ? parseInt(query.p, 10) - 1 : 0;
      offset *= LIMIT;
      Entry.getEntriesByOwnerId(user.id, LIMIT, offset).then(function (entries){
        entries.offset = LIMIT;
        return resolve(entries);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getEntriesByTextSearch = function({body, query, user}){
    return new Promise(function (resolve, reject){
      var index = (query.p) ? parseInt(query.p, 10) - 1 : 0;
      index *= LIMIT;
      var text = query.q.toLowerCase();
      Entry.getEntriesByTextSearch(text, user.id, index, LIMIT).then(function (entries){
        entries.offset = LIMIT;
        return resolve(entries);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getAllEntryIdsByOwnerId = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getAllEntryIdsByOwnerId(user.id).then(function (ids){
        return resolve(ids);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.getEntryById = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getEntryById(body.entryId).then(function (entry){
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
      Entry.createEntry(body, user.id).then(function (entry){
        return resolve(entry.id);
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.updateEntry = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getEntryById(body.id).then(function (entry){
        if(!entry) return reject({status: 404, message: 'Entry not found.'});
        if(user.id !== entry.ownerId) return reject({status: 404, message: 'Entry not found.'});
        Entry.updateEntry(body).then(function (response){
          return resolve();
        }, function (err){
          return reject(err);
        });
      }, function (err){
        return reject({status: 500, message: err});
      });
    });
  }

  self.deleteEntry = function({body, query, user}){
    return new Promise(function (resolve, reject){
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry) return reject({status: 404, message: 'Entry not found.'});
        if(user.id !== entry.ownerId) return reject({status: 404, message: 'Entry not found.'});
        Entry.deleteEntry(entryId).then(function (response){
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
