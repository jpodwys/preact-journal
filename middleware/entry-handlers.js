exports.getEntries = function(req, res, entries){
  res.send({
    entries: resp.rows,
    ids: resp.ids,
    entryCount: resp.ids.length,
    offset: resp.offset,
    query: req.query
  });
}

exports.getAllEntryIdsByOwnerId = function(req, res, ids){
  res.send({ids: ids});
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
