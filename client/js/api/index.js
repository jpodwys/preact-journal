import xhr from '../xhr';
import { fire } from '../../components/unifire';

function getActiveUserId () {
  try {
    var accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    var active = accounts.find(a => a.active);
    return active ? String(active.id) : '';
  } catch(e) {
    return '';
  }
}

export default (url, config, { skipAuth } = {}) => {
  var userId = getActiveUserId();
  return xhr(url, config).catch(err => {
    if(!skipAuth && err.status === 401) fire('handleExpiredSession', userId);
    throw err;
  });
};
