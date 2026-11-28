// ITERATION 1: the ticker board. 40 symbols, every row rendered, one store write per feed message.
// This is kyvo used exactly as designed, with no tricks at all.
import { h, render } from '../../../../core.js';
import { app, quotes, U, init, connect } from '../shared/data.js';
import { money, signed, compact, dirClass } from '../shared/fmt.js';

const Row = ({ q, u }) => (
  <tr>
    <td class="sym">{u.sym}</td>
    <td>{u.name}</td>
    <td class={'num ' + dirClass(q.dir)}>{money(q.last)}</td>
    <td class={'num ' + dirClass(q.chg)}>{signed(q.chg)}</td>
    <td class={'num ' + dirClass(q.pct)}>{signed(q.pct)}%</td>
    <td class="num">{compact(q.vol)}</td>
  </tr>
);

const App = () => {
  const Q = quotes();
  return (
    <div class="board">
      <h1>Ticker board <small>{app.connected ? 'live' : 'offline'}</small></h1>
      <table>
        <thead><tr><th>Symbol</th><th>Name</th><th>Last</th><th>Chg</th><th>Chg %</th><th>Volume</th></tr></thead>
        <tbody>{U.map(u => <Row key={u.i} q={Q[u.i]} u={u} />)}</tbody>
      </table>
    </div>
  );
};

export function start(opts) {
  init({ N: 40, ...opts });
  render(<App />, document.getElementById('app'));
  connect();
  window.__ready = true;
}
