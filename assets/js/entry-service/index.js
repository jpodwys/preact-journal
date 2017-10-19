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
    url: '/user/' + entry.id,
    method: 'PUT',
    body: entry
  });
};

const delete = function(id) {
  return xhr({
    url: '/user/' + id,
    method: 'DELETE'
  });
};

export default { create, get, update, delete };
