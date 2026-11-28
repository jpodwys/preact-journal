// The whole market grid: toolbar (debounced filter + sector chips), sortable header, virtual rows.
import { h } from '../../../../core.js';
import { debounced } from '../../../../helpers.js';
import { app, quotes, U, view, sortBy, setFilter, setSector } from '../shared/data.js';
import { SECTORS } from '../shared/sim.js';
import { Grid } from './grid.js';
import { Row } from './row.js';

const COLS = [['sym', 'Symbol'], ['name', 'Name'], ['sector', 'Sector'], ['last', 'Last'], ['chg', 'Chg'], ['pct', 'Chg %'], ['vol', 'Volume']];

const Toolbar = (props, ctx) => {
  const filter = debounced(ctx, setFilter, 150);
  return (
    <div class="toolbar">
      <input class="search" placeholder="Filter symbols" onInput={e => filter(e.target.value)} />
      <span class={'chip' + (app.sector ? '' : ' on')} onClick={() => setSector('')}>All</span>
      {SECTORS.map(s => <span class={'chip' + (app.sector === s ? ' on' : '')} onClick={() => setSector(s)}>{s}</span>)}
    </div>
  );
};

const HeaderRow = () => (
  <div class="row head">
    {COLS.map(([key, label]) => (
      <span class={'c ' + (key === 'sym' || key === 'name' || key === 'sector' ? key : 'num') + (app.sortKey === key ? ' sorted' : '')} onClick={() => sortBy(key)}>
        {label}{app.sortKey === key ? (app.sortDir > 0 ? ' ▲' : ' ▼') : ''}
      </span>
    ))}
    <span class="c spark">Trend</span>
  </div>
);

export const Market = ({ height = 700 }) => {
  const ids = view(), Q = quotes();
  return (
    <div class="market">
      <Toolbar />
      <HeaderRow />
      <Grid ids={ids} rowH={24} height={height} renderRow={(id, y) => <Row key={id} q={Q[id]} u={U[id]} y={y} sel={id === app.selected} />} />
      <div class="foot">{ids.length.toLocaleString()} of {U.length.toLocaleString()} symbols</div>
    </div>
  );
};
