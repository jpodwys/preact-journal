import { h, render } from '../packages/kyvo/core';
import App from '../components/app';
import { loadEntries } from './load';

render(<App />, document.body);

loadEntries();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
}

