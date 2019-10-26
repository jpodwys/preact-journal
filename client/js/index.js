import { h, render } from 'preact';
import { Provider } from '../components/unifire';
import App from '../components/app';
import getInitialState from '../js/app-state';
import actions from '../js/actions';
import swipe from '../js/swipe';
import arrow from '../js/arrow';

new Provider({
  state: getInitialState(),
  actions
});

render(<App/>, document.body);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
}

swipe(document);
arrow(document);
