import { h } from 'kyvo/core';
import { listen } from 'kyvo/helpers';
import { mail, visible, openFromAddress, open, step } from './store.js';
import List from './list.js';
import Message from './message.js';

const typing = e => e.target.matches('input, textarea');

export default function Mail(props, ctx) {
  // The open message is part of the address, so Back and reload work.
  listen(ctx, window, 'hashchange', openFromAddress);
  ctx.mount(openFromAddress);

  // j and k step through the list, except while typing.
  listen(ctx, document, 'keydown', e => {
    if (typing(e) || e.metaKey || e.ctrlKey) return;
    if (e.key === 'j') step(1);
    if (e.key === 'k') step(-1);
  });

  return (
    <div class="mail">
      <div>
        <button aria-pressed={String(!mail.unreadOnly)} onclick={() => { mail.unreadOnly = false; }}>All</button>
        <button aria-pressed={String(mail.unreadOnly)} onclick={() => { mail.unreadOnly = true; }}>Unread</button>
        <List messages={visible()} />
      </div>
      {mail.open
        // The key gives every message a fresh reply box.
        ? <Message key={mail.open} id={mail.open} onClose={() => open(0)} />
        : <p class="empty">Choose a message, or press j.</p>}
    </div>
  );
}
