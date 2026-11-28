import { h } from 'kyvo/core';
import { listen } from 'kyvo/helpers';

const focus = el => { if (el) el.focus(); };

function Modal(props, ctx) {
  // Added when the modal appears and removed with it.
  listen(ctx, document, 'keydown', e => { if (e.key === 'Escape') props.onClose(); });

  return (
    <div class="modal" role="dialog" aria-label="Confirm">
      <p>Press Escape or Close.</p>
      <button ref={focus} onclick={() => props.onClose()}>Close</button>
    </div>
  );
}

export default function ModalDemo(props, ctx) {
  const s = ctx.state({ open: false });
  return (
    <div>
      <button onclick={() => { s.open = true; }}>Open modal</button>
      {s.open && <Modal onClose={() => { s.open = false; }} />}
    </div>
  );
}
