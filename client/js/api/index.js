import xhr from '../xhr';
import { fire } from '../../components/unifire';
import { getActiveUserId } from '../utils';

export default (url, config = {}, { skipAuth } = {}) => {
  var userId = getActiveUserId();
  if(userId) config.headers = { ...config.headers, 'X-User-Id': userId };
  return xhr(url, config).then(data => {
    return { data, userId };
  }).catch(err => {
    if(!skipAuth && err.status === 401) fire('handleExpiredSession', userId);
    throw err;
  });
};
