import xhr from '../xhr';

const create = function(entry) {
  return xhr('/api/entry', {
    method: 'POST',
    body: entry
  });
};

const get = function(id) {
  return xhr('/api/entry/' + entry.id);
};

const update = function(entryId, entry) {
  return xhr('/api/entry/' + entryId, {
    method: 'PATCH',
    body: entry
  });
};

const del = function(id) {
  return xhr('/api/entry/' + id, {
    method: 'DELETE'
  });
};

const getAll = function() {
  return xhr('/api/entries');
};

const sync = function(timestamp) {
  return xhr('/api/entries/sync/' + timestamp);
};

export default { create, get, update, del, getAll, sync };
