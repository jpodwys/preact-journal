import { h, render } from 'preact';
import { Provider } from '../components/unifire';
import App from '../components/app';
import getInitialState from '../js/app-state';
import actions from '../js/actions';

render(
  <Provider state={getInitialState()} actions={actions}>
    <App />
  </Provider>,
  document.body
);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
}
