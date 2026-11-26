import { h } from '../../../../core.js';
import { slice } from '../session.js';
import { notes } from '../slices/notes.js';
import { STOP } from '../stopwords.js';

// This page's own slice: it exists only once this chunk has loaded, and is persisted and reset like any other.
const ui = slice('stats-ui', () => ({ sort: 'count' }));

const count = items => {
  const seen = {};
  items.forEach(n => (n.text.toLowerCase().match(/[a-z']+/g) || []).forEach(w => { if (!STOP.has(w)) seen[w] = (seen[w] || 0) + 1; }));
  return Object.entries(seen).sort((a, b) => (ui.sort === 'count' ? b[1] - a[1] : 0) || (a[0] < b[0] ? -1 : 1));
};

export default function Stats() {
  const words = count(notes.items);
  return (
    <section aria-label="Stats">
      <h1>Stats</h1>
      <p>{notes.items.length} notes, {words.length} distinct words</p>
      <button onclick={() => { ui.sort = ui.sort === 'count' ? 'alpha' : 'count'; }}>Sort: {ui.sort}</button>
      <ol aria-label="Words">{words.map(([w, n]) => <li key={w}>{w} {n}</li>)}</ol>
    </section>
  );
}
