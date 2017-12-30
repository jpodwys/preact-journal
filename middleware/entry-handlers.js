var date = require('../utils/date');

exports.getAllEntriesByOwnerId = function(req, res, entries){
  res.send({
    entries: entries,
    timestamp: date.getUtcZeroTimestamp()
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
    entries: entries,
    timestamp: date.getUtcZeroTimestamp()
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
