import xhr from '../xhr';

const create = function(user) {
  return xhr({
    url: '/api/user',
    method: 'POST',
    body: user
  });
};

const login = function(user) {
  return xhr({
    url: '/api/user/authenticate',
    method: 'POST',
    body: user
  });
};

const logout = function() {
  localStorage.clear();
};

// const update = function(user) {
//   return xhr({
//     url: '/api/user/' + data.id,
//     method: 'PUT',
//     body: user
//   });
// };

// const delete = function(id) {
//   return xhr({
//     url: '/api/user/' + data.id,
//     method: 'DELETE'
//   });
// };

export default { create, login, logout };
