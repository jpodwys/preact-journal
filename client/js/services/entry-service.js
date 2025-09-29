import xhr from '../xhr';

const getAll = () => xhr('/api/entries');

const sync = timestamp => xhr('/api/entries/sync/' + timestamp);

const create = entry =>
  xhr('/api/entry', {
    method: 'POST',
    body: entry
  }
);

const update = (id, entry) =>
  xhr('/api/entry/' + id, {
    method: 'PATCH',
    body: entry
  }
);

const del = id =>
  xhr('/api/entry/' + id, {
    method: 'DELETE'
  }
);

export default { getAll, sync, create, update, del };
