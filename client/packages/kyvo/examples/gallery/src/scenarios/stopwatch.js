import { h } from 'kyvo/core';

function Ticker(props, ctx) {
  const s = ctx.state({ total: 0 });

  // Runs once, after the first render. The returned function runs when the component is removed.
  ctx.mount(() => {
    // Read props.step here. A destructured `step` would keep its first value forever.
    const timer = setInterval(() => { s.total += props.step; }, 1000);
    return () => clearInterval(timer);
  });

  return <p class="total">Total: {s.total}</p>;
}

export default function Stopwatch(props, ctx) {
  const s = ctx.state({ running: false, step: 1 });
  return (
    <div>
      <button onclick={() => { s.running = !s.running; }}>{s.running ? 'Stop' : 'Start'}</button>
      <button onclick={() => s.step++}>Step: {s.step}</button>
      {/* The timer exists exactly as long as the component does. */}
      {s.running && <Ticker step={s.step} />}
    </div>
  );
}
