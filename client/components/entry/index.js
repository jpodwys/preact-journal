import { h } from '../../packages/kyvo/core';
import { debounced } from '../../packages/kyvo/helpers';
import Icon from '../icon';
import { app, viewEntries } from '../../js/app-state';
import { createEntry, updateEntry, shiftEntry } from '../../js/actions/entry-actions';

// A module-level (stable) ref runs only when the element is created, which is
// exactly when a new entry should take focus (the element is keyed by entry id).
const focusIfNew = el => { if(el && app.view === '/new') el.focus(); };

// `entry` is the one rendered when the input happened, not app.entry at fire
// time: a save still pending after navigating to another entry must not write
// the edited text into the entry now on screen.
const slowUpsert = (e, entry) => {
  if(entry.newEntry){
    createEntry({ entry: {
      ...entry,
      date: document.getElementById('ed').innerText,
      text: document.getElementById('et').innerText
    }});
  } else {
    const property = e.target.id === 'ed' ? 'date' : 'text';
    updateEntry({
      entry: { [property]: e.target.innerText.trim() },
      property,
      entryId: entry.id
    });
  }
};

export default (props, ctx) => {
  const { view, entry, entryIndex } = app;
  // One debounce per entry id: switching entries never replaces another entry's pending save,
  // and leaving the screen runs whatever is pending (debounced never drops a call).
  const upsert = debounced(ctx, slowUpsert, 500, entry ? String(entry.id) : '');
  // Local copy of the text: seeded when the entry changes and otherwise left
  // alone, so re-renders never touch what the user is typing.
  const s = ctx.state({ ident: undefined, date: '', text: '' });
  if(!entry) return <h2 class="center-text fade-up">Looks like that doesn't exist!</h2>
  // /new is one entry per visit: its first save swaps the client id for the server id, and that must not rebuild the editor (caret, typing).
  const ident = view === '/new' ? 'new' : entry.id;
  if(s.ident !== ident) Object.assign(s, { ident, date: entry.date, text: entry.text });

  return (
    <div class="fade-up">
      <div class="entry-header nav-set dark-fill">
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-left'}
            onclick={() => shiftEntry(-1)}
            class={entryIndex > 0 ? 'dark-fill' : 'hidden'}
            role="button"
            aria-label="Previous entry"/>
        }
        <div class="entry-date-wrapper">
          <h1
            id="ed"
            contenteditable
            onInput={e => upsert(e, entry)}
            class="entry-date center-text">
            {s.date}
          </h1>
        </div>
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-right'}
            onclick={() => shiftEntry(1)}
            class={entryIndex < (viewEntries().length - 1) ? 'dark-fill rotate180' : 'hidden'}
            role="button"
            aria-label="Next entry"/>
        }
      </div>
      <div
        id="et"
        contenteditable="plaintext-only"
        class="entry-text"
        onInput={e => upsert(e, entry)}
        ref={focusIfNew}
        key={'entry-' + s.ident}>
        {s.text}
      </div>
    </div>
  );
}
