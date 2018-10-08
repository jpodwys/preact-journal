import xhr from '../xhr';

function getAll () {
  return xhr('/api/entries');
};

function sync (timestamp) {
  return xhr('/api/entries/sync/' + timestamp);
};

function create (entry) {
  return xhr('/api/entry', {
    method: 'POST',
    body: entry
  });
};

function update (id, entry) {
  return xhr('/api/entry/' + id, {
    method: 'PATCH',
    body: entry
  });
};

function del (id) {
  return xhr('/api/entry/' + id, {
    method: 'DELETE'
  });
};

export default { getAll, sync, create, update, del };
