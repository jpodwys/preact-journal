import { fire } from '../../components/unifire';
import { getActiveUserId } from '../utils';

export default (url, config = {}, { skipAuth } = {}) => {
  var userId = getActiveUserId();
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
  }).then(data => ({ data, userId }))
  .catch(err => {
    if(!skipAuth && err.status === 401) fire('handleExpiredSession', userId);
    throw err;
  });
};
