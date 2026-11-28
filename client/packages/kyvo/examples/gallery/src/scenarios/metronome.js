import { h } from 'kyvo/core';
import { effect } from 'kyvo/helpers';

export default function Metronome(props, ctx) {
  const s = ctx.state({ ms: 1000, beats: 0 });

  // A new speed needs a new timer, but the count has to carry on.
  // The returned function stops the old timer before the next one starts, and on removal.
  effect(ctx, () => {
    const timer = setInterval(() => s.beats++, s.ms);
    return () => clearInterval(timer);
  }, [s.ms]);

  return (
    <div>
      <button disabled={s.ms <= 250} onclick={() => { s.ms /= 2; }}>Faster</button>
      <button disabled={s.ms >= 2000} onclick={() => { s.ms *= 2; }}>Slower</button>
      <p class="speed">Every {s.ms} ms</p>
      <p class="total">{s.beats} beats</p>
    </div>
  );
}
