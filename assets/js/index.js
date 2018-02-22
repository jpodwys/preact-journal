import { h, render } from 'preact';
import App from '../components/app';

render(<App />, document.body);

if ('serviceWorker' in navigator){
  // var CACHE = 'preact-journal';

  navigator.serviceWorker.onmessage = function (eTag) {
    // var message = JSON.parse(e.data);

    // var isRefresh = message.type === 'refresh';
    // var isAsset = message.url.includes('asset');
    var lastETag = localStorage.getItem('currentETag');
    var isNew =  lastETag !== eTag;

    if (/*isRefresh && isAsset &&*/ isNew) {
      // if (lastETag) {
      //   notice.hidden = false;
      // }
      localStorage.setItem('currentETag', eTag);
      // location.reload();
    }
  };
}

