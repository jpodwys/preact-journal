import { h } from 'kyvo/core';

export default function TextInput(props, ctx) {
  const s = ctx.state({ name: '' });

  return (
    <div>
      {/* Show the value from state, and store what is typed. */}
      <input aria-label="Name" placeholder="Your name" value={s.name} oninput={e => { s.name = e.target.value; }} />
      <button onclick={() => { s.name = ''; }}>Clear</button>
      <p class="greeting">{s.name ? 'Hello, ' + s.name : 'Who are you?'}</p>
    </div>
  );
}
