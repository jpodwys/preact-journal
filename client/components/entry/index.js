import { h } from '../../packages/kyvo/core';
import { debounced } from '../../packages/kyvo/helpers';
import Icon from '../icon';
import { app, viewEntries, selected } from '../../js/app-state';
import { createEntry, updateEntry, shiftEntry } from '../../js/actions/entry-actions';

// A module-level (stable) ref runs only when the element is created, which is
// exactly when a new entry should take focus (the element is keyed by entry id).
const focusIfNew = el => { if(el && app.view === '/new') el.focus(); };

// Everything is read when the input happens, not when the save runs: by then the screen may show another entry (so
// not the DOM), and a new entry may have its server id (so the entry itself is looked up again).
const slowUpsert = ({ entry, property, date, text }) => {
  const current = app.entries.find(e => e.id === entry.id || e.clientId === entry.id);
  if(!current || current.deleted) return;
  if(current.newEntry) return createEntry({ entry: { ...current, date, text } });
  // If it was new when typed, its POST has returned since, and may have carried neither field as it is now.
  const values = { date: date.trim(), text: text.trim() };
  (entry.newEntry ? ['date', 'text'] : [property]).forEach(p => updateEntry({ entry: { [p]: values[p] }, property: p, entryId: current.id }));
};

const read = id => document.getElementById(id).innerText;

export default (props, ctx) => {
  const { view } = app, [entry, index] = selected();
  // Local copy of the text: seeded when the entry changes and otherwise left
  // alone, so re-renders never touch what the user is typing.
  const s = ctx.state({ id: 0, date: '', text: '' });
  // `s.id` is the id the editor was built for. A new entry getting its server id is not a change of entry: the id
  // stays, so the editor (caret, typing) is not rebuilt.
  if(entry && s.id !== entry.id && s.id !== entry.clientId) Object.assign(s, { id: entry.id, date: entry.date, text: entry.text });
  // One debounce per entry: switching entries never replaces another entry's pending save,
  // and leaving the screen runs whatever is pending (debounced never drops a call).
  const upsert = debounced(ctx, slowUpsert, 500, String(s.id));
  const onInput = e => upsert({ entry, property: e.target.id === 'ed' ? 'date' : 'text', date: read('ed'), text: read('et') });
  if(!entry) return <h2 class="center-text fade-up">Looks like that doesn't exist!</h2>
  return (
    <div class="fade-up">
      <div class="entry-header nav-set dark-fill">
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-left'}
            onclick={() => shiftEntry(-1)}
            class={index > 0 ? 'dark-fill' : 'hidden'}
            role="button"
            aria-label="Previous entry"/>
        }
        <div class="entry-date-wrapper">
          {/* Keyed like the text below: another entry gets a new element, so what was typed in (or done to) the old
            one never shows for it. */}
          <h1
            id="ed"
            key={'date-' + s.id}
            contenteditable
            onInput={onInput}
            class="entry-date center-text">
            {s.date}
          </h1>
        </div>
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-right'}
            onclick={() => shiftEntry(1)}
            class={index < (viewEntries().length - 1) ? 'dark-fill rotate180' : 'hidden'}
            role="button"
            aria-label="Next entry"/>
        }
      </div>
      <div
        id="et"
        contenteditable="plaintext-only"
        class="entry-text"
        onInput={onInput}
        ref={focusIfNew}
        key={'entry-' + s.id}>
        {s.text}
      </div>
    </div>
  );
}
