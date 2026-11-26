# preact-journal

10 kB offline-capable journaling PWA using [kyvo](client/packages/kyvo), a tiny UI framework that lives in this repo, plus node, MySQL, and IndexedDB.

The repo name predates the framework: the front end was originally built on Preact 8 and now runs on kyvo (1.6 KB brotli, against 3.1 KB for Preact 8 alone). Served as a single inlined `index.html`, the app is about 10 KB brotli.

## Layout

- `client/` is the front end (one inlined HTML file when built).
  - `client/packages/kyvo/` is the UI framework: source, TypeScript declarations, specs, docs ([README](client/packages/kyvo/README.md), [SPEC](client/packages/kyvo/SPEC.md)) and an example app.
- `server/` and `app.js` are the Express back end. `test/` holds the app's test infrastructure ([test/README.md](test/README.md)).

## Scripts

- `npm run go` builds the front end and starts the server (the server reads `.env`).
- `npm test` runs the app's specs in headless Chrome. `npm run test:all` also runs the minified bundle, the boot smoke tests, the server middleware spec, the built-artifact test, the framework's specs, the example app and (`TS_PATH` set) the type checks.

## Build notes

### Terser `unsafe` flags (`compress()` in `gulpfile.js`)

The production bundle is minified with terser `unsafe: true, unsafe_arrows: true`. They save about 25 B of the served brotli page (about 0.25%) and are the only build settings that can change runtime semantics. If the minified bundle (`test:prod`, `test:boot-prod`, `test:artifact`, or the real site) misbehaves while the dev build and `npm test` pass, **suspect these flags first**: remove them from `gulpfile.js` and rebuild.

What they rewrite, and when each is wrong:

- `String(x)` becomes `x + ""`, and template literals become concatenation. These differ if `x` is a Symbol (throws) or an object with a custom `valueOf`/`Symbol.toPrimitive`. Today `x` is always a string or number id.
- `function () {}` becomes an arrow function (`unsafe_arrows`). This breaks if the function is used with `new`, `.call`/`.bind` (for `this`), or relies on `arguments`. Terser checks `this` and `arguments` but not `new`. Today these are only local IIFEs and callbacks.

Measured alone against the raw esbuild output (brotli q11): none 8,098 B, `unsafe` 8,074, `unsafe_arrows` 8,077, both 8,073. Two more flags were tried and dropped: `unsafe_methods` (turns arrow properties into method shorthand, so `this` becomes the object; saves about nothing and makes raw output larger) and `pure_getters` (changed nothing). Details of the shrink hunt are in `kyvo-load-test/shrink-hunt/` (outside this repo).
