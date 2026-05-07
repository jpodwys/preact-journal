import api from '../api';

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

export default { login, logout };
