import xhr from '../xhr';

const create = function(entry) {
  return xhr({
    url: '/api/entry',
    method: 'POST',
    body: entry
  });
};

const get = function(id) {
  return xhr({
    url: '/api/entry/' + entry.id
  });
};

const update = function(entryId, entry) {
  return xhr({
    url: '/api/entry/' + entryId,
    method: 'PATCH',
    body: entry
  });
};

const del = function(id) {
  return xhr({
    url: '/api/entry/' + id,
    method: 'DELETE'
  });
};

const getAllForUser = function() {
  return xhr({
    url: '/api/entries'
  });
};

const syncForUser = function(timestamp) {
  return xhr({
    url: '/api/entries/sync',
    query: {timestamp: timestamp}
  });
};

export default { create, get, update, del, getAllForUser, syncForUser };
