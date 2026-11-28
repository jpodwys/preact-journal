import { h } from 'kyvo/core';
import { listen } from 'kyvo/helpers';
import { find, rename, remove } from './store.js';

const focus = el => { if (el) el.focus(); };

export default function Editor(props, ctx) {
  // A copy to type into. Cancelling just throws it away.
  const s = ctx.state(() => ({ title: find(props.id)?.title || '' }));
  listen(ctx, document, 'keydown', e => { if (e.key === 'Escape') props.onClose(); });

  const save = e => {
    e.preventDefault();
    if (s.title.trim()) rename(props.id, s.title.trim());
    props.onClose();
  };

  return (
    <form class="modal" role="dialog" aria-label="Edit card" onsubmit={save}>
      <input aria-label="Title" ref={focus} value={s.title} oninput={e => { s.title = e.target.value; }} />
      <button>Save</button>
      <button type="button" onclick={() => props.onClose()}>Cancel</button>
      <button type="button" onclick={() => { remove(props.id); props.onClose(); }}>Delete card</button>
    </form>
  );
}
