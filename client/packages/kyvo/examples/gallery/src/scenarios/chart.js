import { h } from 'kyvo/core';
import { effect } from 'kyvo/helpers';

// Two made-up data sources. Each returns the next value.
const FEEDS = {
  wave: n => 50 + 40 * Math.sin(n / 4),
  steps: n => 20 + (Math.floor(n / 5) % 4) * 20
};

const points = values => values.map((v, i) => (i * 10) + ',' + (100 - v).toFixed(1)).join(' ');

export default function Chart(props, ctx) {
  const s = ctx.state({ feed: 'wave', paused: false, n: 0, values: [] });

  // Restarts when the feed changes or pausing is toggled. The values already drawn are kept.
  effect(ctx, () => {
    if (s.paused) return;
    const feed = FEEDS[s.feed];
    const timer = setInterval(() => {
      s.values = [...s.values, feed(s.n)].slice(-30);
      s.n++;
    }, 200);
    return () => clearInterval(timer);
  }, [s.feed, s.paused]);

  return (
    <div>
      <select aria-label="Feed" value={s.feed} onchange={e => { s.feed = e.target.value; }}>
        <option value="wave">Wave</option>
        <option value="steps">Steps</option>
      </select>
      <button onclick={() => { s.paused = !s.paused; }}>{s.paused ? 'Resume' : 'Pause'}</button>
      {/* SVG is written like HTML. */}
      <svg class="chart" viewBox="0 0 290 100" width="100%" height="160">
        <polyline points={points(s.values)} fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
      <p class="reading">{s.values.length ? 'Latest: ' + Math.round(s.values[s.values.length - 1]) : 'Waiting for data'}</p>
    </div>
  );
}
