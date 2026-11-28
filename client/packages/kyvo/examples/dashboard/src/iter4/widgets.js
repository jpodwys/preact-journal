import { h } from '../../../../core.js';
import { app, quotes, U, select } from '../shared/data.js';
import { Row } from '../iter2/row.js';
import { signed } from '../shared/fmt.js';

// A pinned table that is deliberately NOT virtualized: every row is always rendered.
export const Pinned = ({ ids }) => {
  const Q = quotes();
  return (
    <div class="pinned">
      <h3>Pinned ({ids.length})</h3>
      <div class="grid-space" style={`height:${ids.length * 24}px`}>{ids.map((id, k) => <Row key={id} q={Q[id]} u={U[id]} y={k * 24} sel={id === app.selected} />)}</div>
    </div>
  );
};

// Heatmap: colour quantized to 21 buckets (so unchanged tiles produce byte-identical style strings).
const bucket = pct => Math.max(-10, Math.min(10, Math.round(pct * 4)));
const color = b => (b >= 0 ? `hsl(135,${30 + b * 5}%,${34 - b}%)` : `hsl(5,${30 - b * 5}%,${34 + b}%)`);

const Tile = ({ q, u, x, y, w, hgt }) => (
  <div class="tile" style={`left:${x}px;top:${y}px;width:${w}px;height:${hgt}px;background:${color(bucket(q.pct))}`} onClick={() => select(u.i)}>
    <b>{u.sym}</b><span>{signed(q.pct)}</span>
  </div>
);

export const Heatmap = ({ ids, cols = 40, w = 36, hgt = 24 }) => {
  const Q = quotes();
  return (
    <div class="heatmap" style={`height:${Math.ceil(ids.length / cols) * hgt}px`}>
      {ids.map((id, k) => <Tile key={id} q={Q[id]} u={U[id]} x={(k % cols) * w} y={Math.floor(k / cols) * hgt} w={w - 1} hgt={hgt - 1} />)}
    </div>
  );
};

const Chart = ({ data, sym, w, hgt }) => {
  let lo = Infinity, hi = -Infinity;
  for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1, step = w / (data.length - 1);
  let d = '';
  for (let k = 0; k < data.length; k++) d += (k ? 'L' : 'M') + (k * step).toFixed(1) + ' ' + (hgt - 4 - (data[k] - lo) / span * (hgt - 8)).toFixed(1);
  return <div class="chart"><b>{sym}</b><svg width={w} height={hgt}><path d={d} fill="none" stroke="#4575b4" stroke-width="1.2" /></svg></div>;
};

export const Charts = ({ ids, w = 220, hgt = 70 }) => (
  <div class="charts">{ids.map(i => <Chart key={i} data={app.series[i]} sym={U[i].sym} w={w} hgt={hgt} />)}</div>
);
