import { h, render } from 'preact';
import { Provider } from '../components/unifire';
import App from '../components/app';
import getInitialState from '../js/app-state';
import actions from '../js/actions';
import { swipeListen, swipeStart, swipeEnd } from '../js/swipe';
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

swipeListen(document, 'mousedown touchstart', swipeStart);
swipeListen(document, 'mouseup touchend', swipeEnd);
arrow(document);
