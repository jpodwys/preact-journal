import { h } from '../../../../core.js';
import { Link } from '../router.js';
import { notes, addNote } from '../slices/notes.js';

export default function Notes(props, ctx) {
  const s = ctx.state({ draft: '' });
  const submit = e => {
    e.preventDefault();
    if (s.draft.trim()) { addNote(s.draft.trim()); s.draft = ''; }
  };
  return (
    <section aria-label="Notes">
      <h1>Notes</h1>
      <form onsubmit={submit} aria-label="Add note">
        <input aria-label="New note" value={s.draft} oninput={e => { s.draft = e.target.value; }} />
        <button type="submit">Add</button>
      </form>
      <ul aria-label="Note list">
        {notes.items.map(n => <li key={n.id}><Link to={'/notes/' + n.id}>{n.text}</Link></li>)}
      </ul>
      {!notes.items.length && <p>No notes yet.</p>}
    </section>
  );
}
