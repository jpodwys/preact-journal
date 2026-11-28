import { store } from 'kyvo/core';

export const mail = store({
  open: 0,
  unreadOnly: false,
  messages: [
    { id: 1, from: 'Ada', subject: 'Engine notes', body: 'The drawings are ready.', read: false },
    { id: 2, from: 'Grace', subject: 'A bug', body: 'Found a moth in the relay.', read: false },
    { id: 3, from: 'Alan', subject: 'Chess', body: 'Your move.', read: false }
  ]
});

export const find = id => mail.messages.find(m => m.id === id);

// The open message stays listed under Unread, so it does not vanish as you read it.
export const visible = () => mail.messages.filter(m => !mail.unreadOnly || !m.read || m.id === mail.open);

const markRead = id => { mail.messages = mail.messages.map(m => (m.id === id && !m.read ? { ...m, read: true } : m)); };

// The address looks like #/mail/2. This is the only place that reads it.
export const openFromAddress = () => {
  const id = Number(location.hash.split('/')[2]) || 0;
  mail.open = find(id) ? id : 0;
  if (mail.open) markRead(mail.open);
};

// Changing the address is how a message gets opened.
export const open = id => { location.hash = id ? '#/mail/' + id : '#/mail'; };

export const step = by => {
  const list = visible();
  const at = list.findIndex(m => m.id === mail.open);
  const next = list[at < 0 ? 0 : at + by];
  if (next) open(next.id);
};
