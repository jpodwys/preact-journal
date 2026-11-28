import { h } from 'kyvo/core';

const FIRST = ['Ada', 'Alan', 'Barbara', 'Donald', 'Grace', 'Margaret'];
const TEAMS = ['Core', 'Design', 'Docs', 'Web'];
const PEOPLE = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1, name: FIRST[i % 6] + ' ' + (i + 1), team: TEAMS[i % 4], score: (i * 37) % 100
}));
const SIZE = 8;

export default function Table(props, ctx) {
  // Only the choices are stored. Everything shown is worked out from them.
  const s = ctx.state({ query: '', sort: 'name', down: false, page: 0, picked: [] });

  const matches = PEOPLE.filter(p => (p.name + ' ' + p.team).toLowerCase().includes(s.query.toLowerCase()));
  const sorted = matches.slice().sort((a, b) =>
    (s.down ? -1 : 1) * (s.sort === 'score' ? a.score - b.score : a[s.sort].localeCompare(b[s.sort])));
  const pages = Math.max(1, Math.ceil(sorted.length / SIZE));
  const page = Math.min(s.page, pages - 1);
  const rows = sorted.slice(page * SIZE, (page + 1) * SIZE);

  const onPage = rows.filter(p => s.picked.includes(p.id)).length;
  const toggle = id => { s.picked = s.picked.includes(id) ? s.picked.filter(x => x !== id) : [...s.picked, id]; };
  const togglePage = () => {
    const ids = rows.map(p => p.id);
    const others = s.picked.filter(id => !ids.includes(id));
    s.picked = onPage === rows.length ? others : [...others, ...ids];
  };
  const sortBy = column => Object.assign(s, { sort: column, down: s.sort === column && !s.down, page: 0 });

  const heading = (column, label) => (
    <th><button onclick={() => sortBy(column)}>{label}{s.sort === column ? (s.down ? ' ↓' : ' ↑') : ''}</button></th>
  );

  return (
    <div>
      <input aria-label="Filter" placeholder="Filter" value={s.query}
        oninput={e => Object.assign(s, { query: e.target.value, page: 0 })} />
      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" aria-label="Select page" checked={rows.length > 0 && onPage === rows.length}
                indeterminate={onPage > 0 && onPage < rows.length} onchange={togglePage} />
            </th>
            {heading('name', 'Name')}
            {heading('team', 'Team')}
            {heading('score', 'Score')}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td><input type="checkbox" aria-label={'Select ' + p.name} checked={s.picked.includes(p.id)} onchange={() => toggle(p.id)} /></td>
              <td>{p.name}</td>
              <td>{p.team}</td>
              <td>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button disabled={page === 0} onclick={() => { s.page = page - 1; }}>Previous</button>
      <button disabled={page >= pages - 1} onclick={() => { s.page = page + 1; }}>Next</button>
      <p class="summary">Page {page + 1} of {pages}. {matches.length} people, {s.picked.length} selected.</p>
    </div>
  );
}
