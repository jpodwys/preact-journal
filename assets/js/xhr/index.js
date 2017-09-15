import { appendParams } from '../qs';

export default function(config) {
  return new Promise(function(resolve, reject) {
    if(!config.url) return reject('No URL provided');

    var url = 'https://riot-demo.herokuapp.com' + config.url;
    var method = (config.method) ? config.method.toUpperCase() : 'GET';
    var body = config.body || '';
    config.query = config.query || {};
    url = url + appendParams(url, config.query).split(url)[1];
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    xhr.onload = function() {
      if (this.status === 401) {
        return window.location.reload();
      }
      if (this.status >= 300){
        return reject(this.response);
      }
      if (this.status === 204) {
        return resolve();
      }
      try {
        return resolve(JSON.parse(this.response));
      } catch(err) {
        return resolve(this.response);
      }
    };

    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(body);
  });
}
