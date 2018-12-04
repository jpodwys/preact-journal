import { h, render } from 'preact';
import { Provider } from '../components/unifire';
import App from '../components/app';
import getInitialState from '../js/app-state';
import actions from '../js/actions';
import swipe from '../js/swipe';
import arrow from '../js/arrow';

render(
  <Provider state={getInitialState()} actions={actions}>
    <App />
  </Provider>,
  document.body
);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
}

swipe.listen(document, 'mousedown touchstart', swipe.swipeStart);
swipe.listen(document, 'mouseup touchend', swipe.swipeEnd);
arrow(document);
