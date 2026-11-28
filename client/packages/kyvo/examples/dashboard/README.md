# Dashboard: how far does brute force go?

A simulated real-time stock dashboard in four iterations of increasing size, used to find where kyvo's re-render-everything
design stops being enough. It imports `core.js` and `helpers.js` from this package, so it always runs the current framework.

    PROD=1 node build.js app && open index.html   # then pick an iteration; every knob is in the URL
    node measure.js                               # render times for all four (node measure.js 4: 4x CPU slowdown)
    npm run test:dashboard                        # from the repo root: every iteration boots and updates

| Iteration | Symbols | What it adds |
|---|---|---|
| 1 Board | 40 | a plain table, every row rendered |
| 2 Market | 1,000 | virtual scrolling, sparklines, sortable live columns, debounced filter, throttled ingest |
| 3 Dashboard | 5,000 | stats bar, watchlist cards, movers, trade tape, order book, sector bars |
| 4 Terminal | 25,000 | a live-sorted 25k grid, a 100-row table that is not virtualized, a 600-tile heatmap, 12 charts, a 300-row tape |

## What the load test found

These results come from the original load test (November 2026, an M4 Mac mini, 244 headless Chrome runs) **on an earlier
version of kyvo**. The limit sweeps behind the bullets below have not been repeated since. The four iterations as built
were re-measured on the same machine after moving here, and came out close to the original run:

| Median render (ms) | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| original, full speed | 1.2 | 5.2 | 7.9 | 19.8 |
| after the move, full speed | 1.2 | 5.1 | 7.9 | 19.5 |
| original, 4x slowdown | 0.8 | 4.7 | 11.8 | 55.9 |
| after the move, 4x slowdown | 0.8 | 4.8 | 11.9 | 57.2 |

- **Write rate is not the problem:** renders are capped at one per frame. Batching ingestion (about every 100 ms) is the
  most effective cheap technique, because the cost is the work around each write, such as copying a large array.
- **The app's own O(N) derived data breaks first** (a live sort of 25,000 rows was about half of render time).
- **kyvo's own limit is rendered DOM nodes:** about 1,000 plain rows or 2,000 tiles held 60 fps; at 4x CPU slowdown,
  about 300 rows or 600 tiles began to slip.
- **`memo` helped between 1.0x and 4.7x,** only for large lists of pure rows that mostly do not change. This copy of the
  dashboard has no `memo`; see [MEMO.md](../../MEMO.md) for the recipe.

Not measured: paint, real phones, parsing real network data.
