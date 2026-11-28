// ITERATION 2: the market grid. 1,000+ symbols behind a virtual list, sparklines, sortable live
// columns, a debounced filter box, and throttled ingestion (one store write per 100 ms).
import { h, render } from '../../../../core.js';
import { app, init, connect } from '../shared/data.js';
import { Market } from './market.js';

const App = () => (
  <div class="board">
    <h1>Market <small>{app.connected ? 'live' : 'offline'}</small></h1>
    <Market height={700} />
  </div>
);

export function start(opts) {
  init({ N: 1000, applyMs: 100, ...opts });
  render(<App />, document.getElementById('app'));
  connect();
  window.__ready = true;
}
