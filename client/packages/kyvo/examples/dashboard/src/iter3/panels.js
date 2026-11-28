import { h } from '../../../../core.js';
import { app, quotes, U, select, marketStats, movers, sectorStats } from '../shared/data.js';
import { SECTORS } from '../shared/sim.js';
import { money, signed, compact, dirClass } from '../shared/fmt.js';
import { spark } from '../iter2/row.js';

export const StatsBar = () => {
  const s = marketStats();
  return (
    <div class="stats">
      <div><label>Index</label><b class={dirClass(s.index - 1000)}>{s.index.toFixed(2)}</b></div>
      <div><label>Advancers</label><b class="up">{s.up}</b></div>
      <div><label>Decliners</label><b class="dn">{s.down}</b></div>
      <div><label>Unchanged</label><b>{s.flat}</b></div>
      <div><label>Volume</label><b>{compact(s.vol)}</b></div>
      <div><label>Trades</label><b>{compact(app.rev)}</b></div>
    </div>
  );
};

export const Card = ({ q, u, sel }) => (
  <div class={'card' + (sel ? ' sel' : '')} onClick={() => select(u.i)}>
    <div class="card-top"><b>{u.sym}</b><span class={dirClass(q.pct)}>{signed(q.pct)}%</span></div>
    <div class={'card-px ' + dirClass(q.dir)}>{money(q.last)}</div>
    {spark(q.hist, q.chg >= 0, 150, 36)}
  </div>
);

export const Watchlist = ({ ids }) => {
  const Q = quotes();
  return <div class="cards">{ids.map(i => <Card key={i} q={Q[i]} u={U[i]} sel={i === app.selected} />)}</div>;
};

const MoverRow = ({ q, u }) => (
  <li onClick={() => select(u.i)}><b>{u.sym}</b><span class="num">{money(q.last)}</span><span class={'num ' + dirClass(q.pct)}>{signed(q.pct)}%</span></li>
);

export const Movers = () => {
  const m = movers(10), Q = quotes();
  return (
    <div class="movers">
      <div><h3>Top gainers</h3><ul>{m.up.map(i => <MoverRow key={i} q={Q[i]} u={U[i]} />)}</ul></div>
      <div><h3>Top losers</h3><ul>{m.down.map(i => <MoverRow key={i} q={Q[i]} u={U[i]} />)}</ul></div>
    </div>
  );
};

const Trade = ({ t, sym }) => (
  <li class={t.side > 0 ? 'up' : t.side < 0 ? 'dn' : ''}><b>{sym}</b><span class="num">{money(t.px)}</span><span class="num">{t.sz}</span></li>
);

export const Tape = ({ rows = 40 }) => (
  <div class="tape"><h3>Trade tape</h3><ul>{app.tape.slice(0, rows).map(t => <Trade key={t.id} t={t} sym={U[t.i].sym} />)}</ul></div>
);

const Level = ({ l, max, side }) => (
  <div class={'lvl ' + side}><i style={`width:${(l.sz / max * 100).toFixed(0)}%`} /><span>{money(l.px)}</span><span class="num">{l.sz}</span></div>
);

export const Book = () => {
  const b = app.book, u = U[app.selected];
  if (!b) return <div class="book" />;
  const max = Math.max(...b.bids.map(l => l.sz), ...b.asks.map(l => l.sz));
  return (
    <div class="book">
      <h3>Order book <small>{u.sym}</small></h3>
      <div>{b.asks.slice().reverse().map(l => <Level key={'a' + l.px} l={l} max={max} side="ask" />)}</div>
      <div>{b.bids.map(l => <Level key={'b' + l.px} l={l} max={max} side="bid" />)}</div>
    </div>
  );
};

export const SectorBars = () => (
  <div class="sectors">
    {sectorStats(SECTORS).map(s => (
      <div class="sector-bar" key={s.sector}><span>{s.sector}</span><i class={dirClass(s.pct)} style={`width:${Math.min(100, Math.abs(s.pct) * 40)}%`} /><b class={dirClass(s.pct)}>{signed(s.pct)}%</b></div>
    ))}
  </div>
);
