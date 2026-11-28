// ITERATION 3: the dashboard. Everything from iteration 2, plus header stats, a watchlist, top movers,
// a trade tape, a level-2 order book and sector bars, all fed by the same stream.
import { h, render } from '../../../../core.js';
import { app, init, connect, startBook } from '../shared/data.js';
import { Market } from '../iter2/market.js';
import { StatsBar, Watchlist, Movers, Tape, Book, SectorBars } from './panels.js';

const WATCH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const App = () => (
  <div class="dash">
    <div class="dash-head"><h1>Dashboard <small>{app.connected ? 'live' : 'offline'}</small></h1><StatsBar /></div>
    <div class="dash-left"><Market height={700} /></div>
    <div class="dash-right">
      <Watchlist ids={WATCH} />
      <div class="two"><Movers /><div><Tape /><Book /></div></div>
      <SectorBars />
    </div>
  </div>
);

export function start(opts) {
  init({ N: 5000, applyMs: 100, tape: 1, ...opts });
  render(<App />, document.getElementById('app'));
  startBook(12, 250);
  connect();
  window.__ready = true;
}
