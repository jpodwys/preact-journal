import xhr from '../xhr';

const create = function(user) {
  return xhr({
    url: '/user',
    method: 'POST',
    body: user
  });
};

const login = function(user) {
  return xhr({
    url: '/user/authenticate',
    method: 'POST',
    body: user
  });
};

// const update = function(user) {
//   return xhr({
//     url: '/user/' + data.id,
//     method: 'PUT',
//     body: user
//   });
// };

// const delete = function(id) {
//   return xhr({
//     url: '/user/' + data.id,
//     method: 'DELETE'
//   });
// };

export default { create, login };
