import { h } from 'kyvo/core';
import { find } from './store.js';

export default function Message(props, ctx) {
  const s = ctx.state({ reply: '', sent: false });
  const message = find(props.id);

  const send = e => {
    e.preventDefault();
    if (s.reply.trim()) Object.assign(s, { reply: '', sent: true });
  };

  return (
    <article class="message">
      <h3>{message.subject}</h3>
      <p>{message.body}</p>
      <form onsubmit={send}>
        <textarea aria-label="Reply" value={s.reply} oninput={e => Object.assign(s, { reply: e.target.value, sent: false })} />
        <button>Send reply</button>
        <button type="button" onclick={() => props.onClose()}>Close</button>
      </form>
      {s.sent && <p class="sent">Reply sent.</p>}
    </article>
  );
}
