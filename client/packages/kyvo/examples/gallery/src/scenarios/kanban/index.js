import { h } from 'kyvo/core';
import { debounced, lazy } from 'kyvo/helpers';
import { board, prefs, COLUMNS, add } from './store.js';
import Column from './column.js';
import Editor from './editor.js';

// The settings panel is loaded the first time it is shown. With code splitting turned on in a build,
// this would be a separate download.
const Loading = () => <p>Loading settings…</p>;
const Settings = lazy(() => import('./settings.js'), Loading);

export default function Kanban(props, ctx) {
  const s = ctx.state({ title: '', query: '', editing: 0, settings: false });
  const search = debounced(ctx, value => { s.query = value.toLowerCase(); }, 150);

  const create = e => {
    e.preventDefault();
    if (!s.title.trim()) return;
    add(s.title.trim());
    s.title = '';
  };

  const shown = board.cards.filter(card => card.title.toLowerCase().includes(s.query));

  return (
    <div class={'kanban' + (prefs.compact ? ' compact' : '')}>
      <form onsubmit={create}>
        <input aria-label="New card" placeholder="New card" value={s.title} oninput={e => { s.title = e.target.value; }} />
        <button>Add card</button>
        <input aria-label="Search cards" placeholder="Search" oninput={e => search(e.target.value)} />
        <button type="button" aria-expanded={String(s.settings)} onclick={() => { s.settings = !s.settings; }}>Settings</button>
      </form>
      {s.settings && <Settings />}
      <div class="columns">
        {COLUMNS.map(column => (
          <Column key={column} column={column} cards={shown.filter(card => card.column === column)}
            onEdit={id => { s.editing = id; }} />
        ))}
      </div>
      {s.editing > 0 && <Editor key={s.editing} id={s.editing} onClose={() => { s.editing = 0; }} />}
    </div>
  );
}
