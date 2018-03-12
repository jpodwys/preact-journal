import xhr from '../xhr';

const getAll = function() {
  return xhr('/api/entries');
};

const sync = function(timestamp) {
  return xhr('/api/entries/sync/' + timestamp);
};

const create = function(entry) {
  return xhr('/api/entry', {
    method: 'POST',
    body: entry
  });
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


export default { getAll, sync, create, update, del };
