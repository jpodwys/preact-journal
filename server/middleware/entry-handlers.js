var date = require('../utils/date');

const removeFalseyFavorited = entry => {
  if(entry.favorited === 0){
    delete entry.favorited;
  }
  return entry;
};

exports.getAllEntriesByOwnerId = function(req, res, entries){
  res.send({
    entries: entries.map(removeFalseyFavorited),
    timestamp: Date.now()
  });
}

exports.getUpdatesSinceTimestamp = function(req, res, entries){
  entries = entries.map(function(entry){
    if(!entry.deleted) return entry;
    return {
      id: entry.id,
      deleted: 1
    };
  });
  res.send({
    entries: entries.map(removeFalseyFavorited),
    timestamp: Date.now()
  });
}

exports.getEntryById = function(req, res, entry){
  res.send({entry: entry});
}

exports.createEntry = function(req, res, id){
  res.send({id: id});
}

exports.updateEntry = function(req, res, data){
  res.sendStatus(204);
}

exports.deleteEntry = function(req, res, data){
  res.sendStatus(204);
}

exports.getEntryCount = function(req, res, total){
  res.send({entryCount: total});
}
