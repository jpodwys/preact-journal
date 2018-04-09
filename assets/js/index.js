import { h, render } from 'preact';
import App from '../components/app';

render(<App />, document.body);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
  // var CACHE = 'preact-journal';

  navigator.serviceWorker.onmessage = function (e) {
    if(!e || !e.data) return;
    var eTag = e.data;
    // var isRefresh = message.type === 'refresh';
    // var isAsset = message.url.includes('asset');
    var lastETag = localStorage.getItem('currentETag');
    var isNew = !!lastETag && !!eTag && lastETag !== eTag;

    if (/*isRefresh && isAsset &&*/ isNew || !lastETag) {
      // if (lastETag) {
      //   notice.hidden = false;
      // }
      localStorage.setItem('currentETag', eTag);

      if(isNew){
        location.reload();
      }
    }
  };
}