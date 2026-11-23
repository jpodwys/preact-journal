import { handleExpiredSession } from '../actions/user-actions';
import { app } from '../app-state';

export default (url, config = {}, { skipAuth } = {}) => {
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
    if(!skipAuth && err.status === 401) handleExpiredSession(userId);
    throw err;
  });
};
