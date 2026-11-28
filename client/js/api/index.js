import { app } from '../app-state';

// Called with the id of the user whose request was answered 401.
let unauthorized = () => {};
export const onUnauthorized = fn => { unauthorized = fn; };

export default (url, config = {}) => {
  var userId = app.userId;
  config.credentials = 'same-origin';
  config.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...config.headers
  };
  if(userId) config.headers['X-User-Id'] = userId;
  if(config.body) config.body = JSON.stringify(config.body);

  return fetch(url, config).then(res => {
    if(res.status >= 300) throw res;
    if(res.status !== 204) return res.json();
  }).catch(err => {
    if(err.status === 401) unauthorized(userId);
    throw err;
  });
};
