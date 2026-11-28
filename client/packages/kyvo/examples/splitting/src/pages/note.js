import { h } from '../../../../core.js';
import { Link } from '../router.js';
import { findNote, editNote, removeNote } from '../slices/notes.js';

export default function Note({ params }) {
  const note = findNote(params.id);
  if (!note) return <p role="alert">That note is gone. <Link to="/notes">Back to notes</Link></p>;
  return (
    <section aria-label="Note">
      <h1>Note</h1>
      <textarea aria-label="Note text" value={note.text} oninput={e => editNote(note.id, e.target.value)} />
      <p>
        <Link to="/notes">Back</Link>
        <button onclick={() => { removeNote(note.id); location.hash = '#/notes'; }}>Delete</button>
      </p>
    </section>
  );
}
