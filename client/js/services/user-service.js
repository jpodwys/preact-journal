import api from '../api';

const create = user =>
  api('/api/user', {
    method: 'POST',
    body: user
  }
);

const login = user =>
  api('/api/user/login', {
    method: 'POST',
    body: user
  }
);

const logout = () =>
  api('/api/user/logout', {
    method: 'POST'
  }
);

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
