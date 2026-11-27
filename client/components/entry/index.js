import { h } from '../../packages/kyvo/core';
import { debounced } from '../../packages/kyvo/helpers';
import Icon from '../icon';
import { app, viewEntries, selected } from '../../js/app-state';
import { sync } from '../../js/sync';
import { editEntry, shiftEntry } from '../../js/actions/entry-actions';

// A module-level (stable) ref runs only when the element is created, which is
// exactly when a new entry should take focus (the element is keyed by entry id).
const focusIfNew = el => { if(el && app.view === '/new') el.focus(); };

export default (props, ctx) => {
  const { view } = app, [entry, index] = selected();
  // Typing goes to the store, and so to disk, at once; only the network waits for a pause. Leaving does not wait.
  const send = debounced(ctx, sync, 500);
  // Local copy of the text: seeded when the entry changes and otherwise left
  // alone, so re-renders never touch what the user is typing.
  const s = ctx.state({ ident: undefined, date: '', text: '' });
  if(!entry) return <h2 class="center-text fade-up">Looks like that doesn't exist!</h2>
  if(s.ident !== entry.id) Object.assign(s, { ident: entry.id, date: entry.date, text: entry.text });
  const onInput = e => {
    if(editEntry(entry.id, { [e.target.id === 'ed' ? 'date' : 'text']: e.target.innerText.trim() })) send();
  };

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
          <h1
            id="ed"
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
        key={'entry-' + s.ident}>
        {s.text}
      </div>
    </div>
  );
}
