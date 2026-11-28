import { h, store } from 'kyvo/core';
import { effect } from 'kyvo/helpers';

// A fake socket. It greets you shortly after connecting and echoes what you send.
function connect(room, receive) {
  const timers = [];
  const later = text => timers.push(setTimeout(() => receive(text), 150));
  later('Welcome to #' + room);
  return {
    send: text => later('echo: ' + text),
    close: () => timers.forEach(clearTimeout)
  };
}

const ROOMS = ['general', 'random'];
const chat = store({ room: 'general', messages: { general: [], random: [] }, drafts: { general: '', random: '' } });
const add = (room, text) => { chat.messages = { ...chat.messages, [room]: [...chat.messages[room], text] }; };

function Room(props, ctx) {
  const messages = chat.messages[props.room];
  // Made once, so the ref runs only when the element appears or goes.
  ctx.list ||= el => { ctx.element = el; };

  // One connection per room. Changing room closes the old one first.
  effect(ctx, () => {
    const room = props.room;
    ctx.socket = connect(room, text => add(room, text));
    return () => ctx.socket.close();
  }, [props.room], 'socket');

  // A second effect needs its own name. It runs after the new messages are on the page.
  effect(ctx, () => { ctx.element.scrollTop = ctx.element.scrollHeight; }, [messages], 'scroll');

  const send = e => {
    e.preventDefault();
    const text = chat.drafts[props.room].trim();
    if (!text) return;
    add(props.room, text);
    ctx.socket.send(text);
    chat.drafts = { ...chat.drafts, [props.room]: '' };
  };

  return (
    <div>
      <ul class="messages" ref={ctx.list}>
        {messages.map(text => <li>{text}</li>)}
      </ul>
      <form onsubmit={send}>
        <input aria-label="Message" value={chat.drafts[props.room]}
          oninput={e => { chat.drafts = { ...chat.drafts, [props.room]: e.target.value }; }} />
        <button>Send</button>
      </form>
    </div>
  );
}

export default () => (
  <div>
    {ROOMS.map(room => (
      <button aria-pressed={String(chat.room === room)} onclick={() => { chat.room = room; }}>#{room}</button>
    ))}
    <Room room={chat.room} />
  </div>
);
