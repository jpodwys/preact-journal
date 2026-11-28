// The market data layer shared by every iteration: one global store, plain-function actions
// (the kyvo convention), and the knobs this load test turns:
//   strategy  'copy': app.quotes is replaced by a NEW array on every batch (pure, immutable, O(N) per write)
//             'mut' : one mutable array of immutable quote objects, plus a revision counter (O(changed) per write)
//   applyMs   0: one store write PER TICK   -1: one write per feed message   >0: buffer, write every N ms
//   sortMs    0: re-sort every revision     >0: re-sort at most every N ms (rows still show live values)
import { store } from '../../../../core.js';
import { makeUniverse, makeTicks, feed, makeBook } from './sim.js';

export const app = store({
  rev: 0, sortRev: 0, quotes: [], selected: 0, sortKey: 'vol', sortDir: -1, filter: '', sector: '',
  tape: [], book: null, connected: false, series: {},
});

export let U = [];            // static reference data (never changes after init)
export let cfg = {};
let Q = [];                   // the 'mut' strategy's array
let buffered = [];
export const probe = globalThis.__probe = { applyMs: 0, applies: 0, ticks: 0, writes: 0, deriveMs: 0 };
const timed = f => (...a) => { const t = performance.now(); const r = f(...a); probe.deriveMs += performance.now() - t; return r; };

export const quotes = () => (cfg.strategy === 'mut' ? Q : app.quotes);

const FIELD_SORT = { sym: 1, name: 1, sector: 1 };

export function init(opts) {
  cfg = { N: 1000, rate: 1000, strategy: 'copy', applyMs: -1, sortMs: 0, tape: 0, ...opts };
  U = makeUniverse(cfg.N);
  const q = U.map(u => ({ i: u.i, last: u.price, prev: u.price, open: u.price, hi: u.price, lo: u.price, vol: 0, chg: 0, pct: 0, dir: 0, n: 0, hist: Array(30).fill(u.price) }));
  if (cfg.strategy === 'mut') { Q = q; app.rev = 1; } else app.quotes = q;
  return cfg;
}

// Folds a batch of feed messages into new immutable quote objects and publishes them with ONE write.
function apply(msgs) {
  const t0 = performance.now();
  const base = quotes(), work = new Map(), trades = [];
  let ticks = 0;
  for (const m of msgs) {
    const n = m.idx.length;
    for (let k = 0; k < n; k++) {
      const i = m.idx[k];
      let q = work.get(i);
      if (!q) { const b = base[i]; q = { ...b, hist: b.hist.slice() }; work.set(i, q); }
      const last = Math.max(0.01, Math.round(q.last * (1 + m.ret[k]) * 100) / 100);
      if (last !== q.last) q.dir = last > q.last ? 1 : -1;
      q.last = last;
      if (last > q.hi) q.hi = last;
      if (last < q.lo) q.lo = last;
      q.vol += m.size[k];
      q.n++;
      q.hist.push(last);
      if (cfg.tape && n - k <= 40) trades.push({ id: probe.ticks + ticks + k, i, px: last, sz: m.size[k], side: q.dir });
    }
    ticks += n;
  }
  for (const q of work.values()) {
    if (q.hist.length > 30) q.hist = q.hist.slice(-30);
    q.chg = q.last - q.prev;
    q.pct = (q.last / q.prev - 1) * 100;
  }
  if (cfg.strategy === 'mut') for (const [i, q] of work) Q[i] = q;
  else { const next = base.slice(); for (const [i, q] of work) next[i] = q; app.quotes = next; }
  if (trades.length) app.tape = trades.reverse().concat(app.tape).slice(0, 200);
  appendSeries(work);
  app.rev++;
  probe.ticks += ticks; probe.applies++; probe.writes++;
  probe.applyMs += performance.now() - t0;
}

const ingest = m => {
  if (cfg.applyMs < 0) apply([m]);
  else if (cfg.applyMs === 0) {   // the naive client: a store write for every single tick
    for (let k = 0; k < m.idx.length; k++) apply([{ idx: m.idx.subarray(k, k + 1), ret: m.ret.subarray(k, k + 1), size: m.size.subarray(k, k + 1) }]);
  } else buffered.push(m);
};

let timers = [], source;
export function connect() {
  const ticks = makeTicks(cfg.N, 600000);
  if (cfg.applyMs > 0) timers.push(setInterval(() => { if (buffered.length) { const b = buffered; buffered = []; apply(b); } }, cfg.applyMs));
  if (cfg.sortMs > 0) timers.push(setInterval(() => { app.sortRev++; }, cfg.sortMs));
  source = feed(ticks, cfg.rate, ingest);
  app.connected = true;
}
export function disconnect() { source && source.stop(); timers.forEach(clearInterval); timers = []; buffered = []; app.connected = false; }

// A fake level-2 feed for the selected symbol.
export function startBook(levels, ms) {
  const tick = () => { const q = quotes()[app.selected]; if (q) app.book = makeBook(q.last, levels); };
  tick();
  timers.push(setInterval(tick, ms));
}

// ---- actions (plain functions; components never write the store except UI flags)
export const select = i => { app.selected = i; if (app.book) app.book = makeBook(quotes()[i].last, app.book.bids.length); };
export const sortBy = key => {
  if (app.sortKey === key) app.sortDir = -app.sortDir;
  else { app.sortKey = key; app.sortDir = FIELD_SORT[key] ? 1 : -1; }
};
export const setFilter = text => { app.filter = text; };
export const setSector = s => { app.sector = s; };

// ---- derived data, memoized on the inputs that matter (a plain function, like the journal's viewEntries)
let fKey = '', fIds = [];
let vKey = '', vIds = [];
function _view() {
  const fk = app.filter + '|' + app.sector;
  if (fk !== fKey) {
    const f = app.filter.toLowerCase(), s = app.sector, ids = [];
    for (let k = 0; k < U.length; k++) {
      const u = U[k];
      if (s && u.sector !== s) continue;
      if (f && !u.symL.includes(f) && !u.nameL.includes(f)) continue;
      ids.push(k);
    }
    fKey = fk; fIds = ids; vKey = '';
  }
  const vk = (cfg.sortMs ? app.sortRev : app.rev) + '|' + app.sortKey + '|' + app.sortDir + '|' + fk;
  if (vk !== vKey) {
    const key = app.sortKey, dir = app.sortDir, Qa = quotes(), ids = fIds.slice();
    if (FIELD_SORT[key]) ids.sort((a, b) => (U[a][key] < U[b][key] ? -dir : U[a][key] > U[b][key] ? dir : 0));
    else ids.sort((a, b) => (Qa[b][key] - Qa[a][key]) * -dir || a - b);
    vKey = vk; vIds = ids;
  }
  return vIds;
}

let sKey = -1, sVal;
function _marketStats() {
  if (sKey === app.rev) return sVal;
  const Qa = quotes();
  let up = 0, down = 0, vol = 0, cap = 0, capPrev = 0;
  for (let k = 0; k < Qa.length; k++) {
    const q = Qa[k];
    if (q.chg > 0) up++; else if (q.chg < 0) down++;
    vol += q.vol; cap += q.last * U[k].cap; capPrev += q.prev * U[k].cap;
  }
  sKey = app.rev;
  return sVal = { up, down, flat: Qa.length - up - down, vol, index: cap / capPrev * 1000 };
}

let mKey = -1, mVal;
function _movers(k) {
  if (mKey === app.rev) return mVal;
  const Qa = quotes(), top = [], bot = [];
  for (let n = 0; n < Qa.length; n++) {
    const p = Qa[n].pct;
    if (top.length < k || p > Qa[top[top.length - 1]].pct) { top.push(n); top.sort((a, b) => Qa[b].pct - Qa[a].pct); if (top.length > k) top.pop(); }
    if (bot.length < k || p < Qa[bot[bot.length - 1]].pct) { bot.push(n); bot.sort((a, b) => Qa[a].pct - Qa[b].pct); if (bot.length > k) bot.pop(); }
  }
  mKey = app.rev;
  return mVal = { up: top, down: bot };
}

// ---- extras used by the bigger iterations
let ssKey = -1, ssVal;
function _sectorStats(sectors) {
  if (ssKey === app.rev) return ssVal;
  const Qa = quotes(), acc = {};
  for (const s of sectors) acc[s] = { sector: s, n: 0, pct: 0 };
  for (let k = 0; k < Qa.length; k++) { const a = acc[U[k].sector]; a.n++; a.pct += Qa[k].pct; }
  ssKey = app.rev;
  return ssVal = sectors.map(s => ({ sector: s, pct: acc[s].n ? acc[s].pct / acc[s].n : 0, n: acc[s].n }));
}

// Long price series for a few tracked symbols (the charts): one point appended per applied batch.
let tracked = [];
export function track(list) {
  tracked = list;
  const s = {};
  for (const i of list) s[i] = Array(200).fill(quotes()[i].last);
  app.series = s;
}
export function appendSeries(work) {
  if (!tracked.length) return;
  let s = null;
  for (const i of tracked) { const q = work.get(i); if (q) { s = s || { ...app.series }; s[i] = s[i].slice(-199).concat(q.last); } }
  if (s) app.series = s;
}

// the derived-data functions, timed (their cost is the app's, not the framework's)
export const view = timed(_view), marketStats = timed(_marketStats), movers = timed(_movers), sectorStats = timed(_sectorStats);
