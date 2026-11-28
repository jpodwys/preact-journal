import { h } from '../../../../core.js';
import { select } from '../shared/data.js';
import { money, signed, compact, dirClass } from '../shared/fmt.js';

// A plain function (not a component): cheap, and it can only be re-run by its parent's render.
export const spark = (data, up, w = 80, hgt = 20) => {
  let lo = Infinity, hi = -Infinity;
  for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1, step = w / (data.length - 1);
  let pts = '';
  for (let k = 0; k < data.length; k++) pts += (k * step).toFixed(1) + ',' + (hgt - 1 - (data[k] - lo) / span * (hgt - 2)).toFixed(1) + ' ';
  return <svg width={w} height={hgt}><polyline points={pts} fill="none" stroke={up ? '#1a9850' : '#d73027'} stroke-width="1.5" /></svg>;
};

// Depends on its props alone (and the stable `select` action).
export const Row = ({ q, u, y, sel }) => (
  <div class={'row' + (sel ? ' sel' : '')} style={`transform:translateY(${y}px)`} onClick={() => select(u.i)}>
    <span class="c sym">{u.sym}</span>
    <span class="c name">{u.name}</span>
    <span class="c sector">{u.sector}</span>
    <span class={'c num ' + dirClass(q.dir)}>{money(q.last)}</span>
    <span class={'c num ' + dirClass(q.chg)}>{signed(q.chg)}</span>
    <span class={'c num ' + dirClass(q.pct)}>{signed(q.pct)}%</span>
    <span class="c num">{compact(q.vol)}</span>
    <span class="c spark">{spark(q.hist, q.chg >= 0)}</span>
  </div>
);
