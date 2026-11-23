# preact-journal

10 kB offline-capable journaling PWA using [kyvo](client/packages/kyvo), a tiny UI framework that lives in this repo, plus node, MySQL, and IndexedDB.

The repo name predates the framework: the front end was originally built on Preact 8 and now runs on kyvo (1.6 KB brotli, against 3.1 KB for Preact 8 alone). Served as a single inlined `index.html`, the app is about 10 KB brotli.

## Layout

- `client/` is the front end (one inlined HTML file when built).
  - `client/packages/kyvo/` is the UI framework: source, TypeScript declarations, specs, docs ([README](client/packages/kyvo/README.md), [SPEC](client/packages/kyvo/SPEC.md)) and an example app.
- `server/` and `app.js` are the Express back end. `test/` holds the app's test infrastructure ([test/README.md](test/README.md)).

## Scripts

- `npm run go` builds the front end and starts the server (the server reads `.env`).
- `npm test` runs the app's specs in headless Chrome. `npm run test:all` also runs the minified bundle, the boot smoke tests, the built-artifact test, the framework's specs, the example app and (`TS_PATH` set) the type checks.
