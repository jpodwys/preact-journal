function getActiveUserId () {
  try {
    var accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    var active = accounts.find(a => a.active);
    return active ? String(active.id) : '';
  } catch(e) {
    return '';
  }
}

export default (url, config = {}) => {
  var userId = getActiveUserId();
  config.credentials = 'same-origin';
  config.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if(userId) config.headers['X-User-Id'] = userId;
  if(config.body) config.body = JSON.stringify(config.body);

  return fetch(url, config).then(res => {
    if(res.status >= 300) throw res;
    if(res.status !== 204) return res.json();
  });
}
