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

const update = function(entry) {
  return xhr({
    url: '/api/entry/' + entry.id,
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

const getForUser = function() {
  return xhr({
    url: '/api/entries'
  });
};

const getAllForUser = function() {
  return xhr({
    url: '/api/getAllEntriesByOwnerId'
  });
};

export default { create, get, update, del, getForUser, getAllForUser };
