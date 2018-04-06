import xhr from '../xhr';

function create (user) {
  return xhr('/api/user', {
    method: 'POST',
    body: user
  });
};

function login (user) {
  return xhr('/api/user/login', {
    method: 'POST',
    body: user
  });
};

function logout () {
  return xhr('/api/user/logout', {
    method: 'POST'
  });
};

// function update (user) {
//   return xhr({
//     url: '/api/user/' + data.id,
//     method: 'PUT',
//     body: user
//   });
// };

// function delete (id) {
//   return xhr({
//     url: '/api/user/' + data.id,
//     method: 'DELETE'
//   });
// };

export default { create, login, logout };
