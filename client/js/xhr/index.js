export default (url, config = {}) => {
  config.credentials = 'same-origin';
  config.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...config.headers
  };
  if(config.body) config.body = JSON.stringify(config.body);

  return fetch(url, config).then(res => {
    if(res.status >= 300) throw res;
    if(res.status !== 204) return res.json();
  });
}
