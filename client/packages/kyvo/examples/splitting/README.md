# Code splitting: route-based chunks, `lazy()`, and lazily loaded store slices

A small app ("Field notes": notes, a note page, a stats page) whose routes are separate files. It exists to answer two questions about kyvo:
how does route-based code splitting work, and what happens to state that lives in code that has not loaded yet?

    node build.js app && node serve.js      # then open http://127.0.0.1:8080  (ES module chunks do not load from file://)
    npm run test:splitting                  # from the repo root: 14 + 14 specs (dev, minified), 12 real-browser specs, a mutation check
    node size.js                            # production sizes, per file

## How it works

- **Routes.** `src/router.js` is about 40 lines of hash routing. It renders the first route in a table whose pattern matches and passes it `params`;
  it has no idea which pages are lazy. In `src/components.js` each page is `lazy(() => import('./pages/notes.js'), Loading, Failed)`. That is the whole of
  route-based splitting: the `import()` is what esbuild cuts into a file, and `lazy()` fetches it on first render.
- **State.** kyvo has no store registry, so there is nothing to register: `pages/stats.js` creates its own `store()` when it loads and components read it.
  `src/session.js` holds the few lines of app-level lifecycle (`slice()`: hydrate when created, persist every write, know how to reset), and
  `resetAll()` also sweeps saved keys of slices that never loaded, so "Reset data" is complete even for code that was never fetched.
- **Shared code.** `slices/notes.js` is imported by three pages. esbuild puts it in a chunk those pages share, fetched once.
- **Prefetch.** Hovering or focusing a link calls the page's `preload()`.
- **Failure.** If a chunk cannot be fetched the page shows `Failed` with a Retry button. Chrome retries a failed dynamic `import()` of the same URL, so `retry()` needs no cache-busting.

## What the numbers say (production, mangled, brotli q11)

| | bytes |
|---|---|
| first download (`main.js` and the chunks it imports) | 2,813 in 3 files |
| the same app as one file | 3,558 |
| every page visited (7 files) | 4,295 |

Splitting trades total bytes (+737 if you visit everything) and requests for a smaller first download (-21%). For an app this size that is not a win worth having;
it pays off when a page is large or rarely used. `lazy()` itself costs about 160 B in a bundle that uses it.

## What the tests check

- `test/app.spec.js` (karma): the app's logic, with every `import()` inlined into one bundle, in dev and minified mode.
- `test/split.spec.js` (Chrome over CDP, no karma): builds with real splitting, serves it, and watches which files are requested. The first load fetches no page
  (it checks the shipped code, not just file names); a page's chunk is fetched once, on first visit; routes sharing a slice share one chunk; hover starts a fetch
  without navigating; a failed chunk shows `Failed` and Retry recovers; the full flow works across chunks. Runs against the dev build and the minified build with
  `mangleProps`, which would break if chunks disagreed about mangled names.
- `test/mutation-check.js`: proves the browser spec can fail. It builds the app with the stats page imported statically (the mutation is an esbuild plugin that
  rewrites a module as it is read, so no source file is touched), and requires the first-load check to fail for the expected reason, after a control run on the
  correct build passes. About two seconds, and every run is a child process with a kill timeout.

## What this does not do

- No offline story. A chunk that was never fetched is not available offline; an offline-capable app has to precache its chunks (the journal app's service worker
  precaches two URLs, which is why it does not split).
- The entry imports a shared chunk that holds the framework, so the first load is two round trips (`main.js`, then that chunk). `<link rel="modulepreload">` would make them parallel.
- Hash routing only; no scroll restoration, no route guards, no nested layouts.
