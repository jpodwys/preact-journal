import xhr from '../xhr';

const create = function(entry) {
  return xhr({
    url: '/entry',
    method: 'POST',
    body: entry
  });
};

const get = function(id) {
  return xhr({
    url: '/entry/' + entry.id
  });
};

const update = function(entry) {
  return xhr({
    url: '/entry/' + entry.id,
    method: 'PUT',
    body: entry
  });
};

const del = function(id) {
  return xhr({
    url: '/entry/' + id,
    method: 'DELETE'
  });
};

const getForUser = function() {
  return xhr({
    url: '/entries'
  });
};

export default { create, get, update, del, getForUser };
