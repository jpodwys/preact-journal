import { h } from 'kyvo/core';

export default function Counter(props, ctx) {
  // State that belongs to this component. Assigning to it re-renders the app.
  const s = ctx.state({ count: 0 });

  return (
    <div>
      <button onclick={() => s.count++}>Clicked {s.count} times</button>
      <button onclick={() => { s.count = 0; }}>Reset</button>
    </div>
  );
}
