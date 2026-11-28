import { h } from 'kyvo/core';
import { mail } from './store.js';

export default ({ messages }) => (
  <ul class="inbox">
    {messages.map(m => (
      <li key={m.id}>
        <a href={'#/mail/' + m.id} class={m.read ? 'read' : 'unread'} aria-current={m.id === mail.open ? 'true' : null}>
          <strong>{m.from}</strong> {m.subject}
        </a>
      </li>
    ))}
  </ul>
);
