import { h, store } from 'kyvo/core';
import { debounced } from 'kyvo/helpers';

// `drafts` is what you see. `saved` stands in for a server.
const notes = store({
  selected: 1,
  drafts: { 1: 'Buy milk', 2: 'Call Sam' },
  saved: { 1: 'Buy milk', 2: 'Call Sam' }
});

function Editor({ id }, ctx) {
  // One pending save per note id. It still runs if you leave before the delay ends.
  const save = debounced(ctx, text => { notes.saved = { ...notes.saved, [id]: text }; }, 600, String(id));

  const input = e => {
    // The draft is stored at once, so switching away and back never shows old text.
    notes.drafts = { ...notes.drafts, [id]: e.target.value };
    save(e.target.value);
  };

  // The key gives each note its own textarea, with its own undo history.
  return <textarea key={id} aria-label="Note" value={notes.drafts[id]} oninput={input} />;
}

export default () => (
  <div>
    {[1, 2].map(id => <button aria-pressed={String(notes.selected === id)} onclick={() => { notes.selected = id; }}>Note {id}</button>)}
    <div><Editor id={notes.selected} /></div>
    <p class="status">{notes.saved[notes.selected] === notes.drafts[notes.selected] ? 'Saved' : 'Saving…'}</p>
    <p class="server">Server has: {notes.saved[notes.selected]}</p>
  </div>
);
