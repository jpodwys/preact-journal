import { h, render } from 'preact';
import App from '../components/app';

render(<App />, document.body);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
  
  navigator.serviceWorker.onmessage = function (e) {
    let eTag = e.data;
    let lastETag = localStorage.getItem('currentETag');
    let isNew = !!lastETag && !!eTag && lastETag !== eTag;

    if(isNew || !lastETag) {
      localStorage.setItem('currentETag', eTag);
      // if(isNew) location.reload();
    }
  };
}
