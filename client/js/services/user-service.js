import xhr from '../xhr';

const create = user =>
  xhr('/api/user', {
    method: 'POST',
    body: user
  }
);

const login = user =>
  xhr('/api/user/login', {
    method: 'POST',
    body: user
  }
);

const logout = () =>
  xhr('/api/user/logout', {
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
