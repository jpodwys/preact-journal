import { h } from 'kyvo/core';

export default function Events(props, ctx) {
  const s = ctx.state({ last: 'Nothing yet' });

  // A handler receives the browser's own event.
  const say = text => { s.last = text; };

  const follow = e => {
    e.preventDefault();
    say('Link clicked, but we stayed here');
  };

  return (
    <div>
      {/* Pass a function. Do not call it here. */}
      <button onclick={() => say('Button clicked')}>Click me</button>
      <input aria-label="Type here" placeholder="Type here" onkeydown={e => say('Key: ' + e.key)} />
      <p><a href="#nowhere" onclick={follow}>A link that does not navigate</a></p>
      <p class="last">{s.last}</p>
    </div>
  );
}
