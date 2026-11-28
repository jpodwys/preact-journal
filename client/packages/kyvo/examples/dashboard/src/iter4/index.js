// ITERATION 4: the terminal. Everything from iteration 3 at 25,000 symbols sorted live by a moving
// column, plus a 100-row pinned table that is not virtualized, a 600-tile heatmap, 12 live charts and a
// 300-row trade tape. Every knob is an option so the sweeps can push each one until something gives.
import { h, render } from '../../../../core.js';
import { app, U, init, connect, startBook, track } from '../shared/data.js';
import { Market } from '../iter2/market.js';
import { StatsBar, Movers, Tape, Book, SectorBars } from '../iter3/panels.js';
import { Pinned, Heatmap, Charts } from './widgets.js';

let cfg;
const range = n => Array.from({ length: n }, (_, k) => k);

const App = () => (
  <div class="term">
    <div class="dash-head"><h1>Terminal <small>{app.connected ? 'live' : 'offline'}</small></h1>{cfg.on.stats ? <StatsBar /> : null}</div>
    <div class="term-a">{cfg.on.market ? <Market height={cfg.gridH} /> : null}</div>
    <div class="term-b">
      <Charts ids={cfg.charts} />
      <Heatmap ids={cfg.tiles} />
      {cfg.on.sectors ? <SectorBars /> : null}
    </div>
    <div class="term-c">
      {cfg.on.movers ? <Movers /> : null}
      <Tape rows={cfg.tapeRows} />
      {cfg.on.book ? <Book /> : null}
      <Pinned ids={cfg.pinned} />
    </div>
  </div>
);

export function start(opts) {
  const o = { N: 25000, applyMs: 100, tape: 1, sortKey: 'pct', pinned: 100, tiles: 600, charts: 12, tapeRows: 300, gridH: 700, ...opts };
  init(o);
  app.sortKey = o.sortKey; app.sortDir = -1;
  const { sortKey, ...rest } = o;
  cfg = { on: { stats: o.stats !== 0, market: o.market !== 0, sectors: o.sectors !== 0, movers: o.movers !== 0, book: o.book !== 0 }, gridH: o.gridH, tapeRows: o.tapeRows, pinned: range(o.pinned), tiles: U.map(u => u.i).sort((a, b) => U[b].cap - U[a].cap).slice(0, o.tiles), charts: range(o.charts) };
  track(cfg.charts);
  render(<App />, document.getElementById('app'));
  startBook(30, 250);
  connect();
  window.__ready = true;
}
