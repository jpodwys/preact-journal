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

const switchAccount = (userId) =>
  api('/api/user/switch', {
    method: 'POST',
    body: { userId }
  }, { skipAuth: true }
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

export default { create, login, logout, switchAccount };
