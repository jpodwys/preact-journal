# Tests

Run everything from the repo root; nothing is installed here (tools resolve from the root `node_modules`). Every
suite runs in headless Chrome with `fetch` mocked at the network layer (`test/api-mocks.js`); none talks to a real
server or reads `.env`. `npm run test:all` runs all of it.

| Script | What it proves |
|---|---|
| `npm test` | The app's specs (webpack + babel): units, components with real events, and the journeys. |
| `npm run test:prod` | The same specs, minified with the shipped esbuild options (`__DEV__` false). |
| `npm run test:boot` | The real entry point boots, logged in and logged out. |
| `npm run test:boot-prod` | The same, from the minified entry. |
| `npm run test:server` | `server/middleware/precompressed-static.js` on a real express app: content-hash ETags, `no-cache`, 304 handling, fall-through. Lives in `test/server/`. |
| `npm run test:artifact` | The real `gulp build` output, served with the real CSP header and service worker. |
| `npm run test:kyvo` | The framework's own specs (dev, minified, mangled). Lives in `client/packages/kyvo/test/`. |
| `npm run test:examples` | The example app on kyvo (`client/packages/kyvo/examples/tasks`). |
| `npm run test:types` | The TypeScript declarations (`TS_PATH` must point at a TypeScript >= 5.1 install). |

## 1. Normal suite

    npm test                                  # SPECS=components/entry,js/utils npm test  runs a subset (paths under client/)

`test/mount.js` is the harness: `mount(vnode, { state })` resets the store (it is a module singleton), merges `state`
over a fresh initial state and mounts into a detached `div`. `fireEvent` dispatches real events. A spec that asserts a
dev-only behavior (the deep freeze, the misuse errors, the render-loop guard) uses `devOnly(...)`, which skips itself in
the minified bundles where `__DEV__` is false. The journeys in `client/components/app/index.spec.js` drive the whole app
(entry create, edit, delete and favorite, each online and offline write and replay; search; login; logout; expired
session; account switch). The framework's specs under `client/packages/` are excluded from this suite (they have their
own runner).

### Waiting

`mount()` renders synchronously, so the first assertions can use `getBy*` / `queryBy*`. Anything that follows an event,
a store write or a response shows up later, so wait for it. The specs should not care how or when the app renders.

Every single-element query throws when more than one element matches (`find*` keeps retrying until one does). To say
which one you mean, search inside an element:

    const banner = env.getByRole('banner');
    const deleteButton = await within(banner).findByRole('button', { name: 'Delete entry' });
    fireEvent.click(deleteButton);

| To wait for | Use |
|---|---|
| an element to appear | `env.findByText`, `env.findByRole`, `env.findBySelector` |
| an element to go away | `waitForElementToBeRemoved(() => env.queryByText(...))` (fails if it was never there) |
| anything else (an attribute, the store, a fetch call, IndexedDB, the URL) | `waitFor(() => expect(...))`; the callback may be async |
| every request to have finished | `networkIdle()` |
| nothing: you are asserting that something did **not** change | `nextRender()`, then assert |

`find*` and `waitFor` retry every 10ms for up to 1s, on real timers even when a spec fakes `setTimeout`.

Polling returns as soon as it passes, which is wrong in these cases:

- **The element is already there.** List rows have their own "Delete entry" and "Toggle favorite" buttons, so right
  after clicking a row, an unscoped query can find a row's button (with one row, it is the only match). Look inside the
  `banner`, as above. The editor also holds the entry's text, so look for a list row by `.entry-preview`.
- **The state is already true.** An offline write sets `needsSync` before its request fails. To assert what is true
  after the failure, wait for the request, then `networkIdle()`.
- **Absence.** `waitFor(() => expect(x).to.be.null)` passes if `x` has not appeared *yet*. Wait for something that
  proves the screen has moved on, then assert the absence.
- **No change.** "The editor was not rebuilt" passes before the render that might rebuild it. Wait for the cause, then
  `nextRender()`.
- **Promptness.** "Leaving the entry saves at once" must assert without waiting, or the 500ms debounce would satisfy it.

`mount()` resets the store, which leaves one frame scheduled. A test proving that something *causes* a re-render calls
`await nextRender()` after mounting, or that leftover frame will do the rendering for it.

`nextRender()` is the only helper that knows about rendering (a microtask plus two frames). `app/scheduling.spec.js` is
about the renderer and uses it throughout. kyvo's scheduler re-renders only the root rendered last, so a spec keeps one
mounted at a time.

Chrome silently drops `history.replaceState`/`pushState` after about 200 calls in 10 seconds, so the karma configs launch
Chrome with `--disable-ipc-flooding-protection`.

## 2. Same specs against a production-shaped build

    npm run test:prod                         # MANGLE=1 node test/build-prod-tests.js && karma start test/karma.prod.conf.js --single-run  for mangled

Bundles every `client/**/*.spec.js` (except `packages/`) with the shipped esbuild options (minify, browserslist target, jsx
h/Fragment, `.js` as jsx, `__DEV__` false) into `test/.prod/` (generated, git-ignored). `MANGLE=1` adds `mangleProps: /^_/`.
A `Buffer` shim and a `global` define are injected for fetch-mock's bundled whatwg-url (webpack 4 polyfilled these
implicitly); they affect test dependencies only. The esbuild iife output is sloppy-mode, unlike webpack's strict ESM modules.

## 3. Real bootstrap smoke test (one scenario per page run)

    npm run test:boot                         # BOOT_SCENARIO=in|out karma start test/karma.boot.conf.js --single-run

Imports the real entry `client/js/index.js` (which renders into `document.body` on import) with
`navigator.serviceWorker.register` stubbed. The spec recomputes the store from the seeded storage right before requiring
the entry (the store singleton is built when the bundle loads, earlier than the seeding; in production it loads once).
`BOOT_ENTRY=/abs/path.js` swaps the entry module (used to prove the test fails when `render(...)` is removed).

## 4. Real bootstrap smoke test against the MINIFIED entry (esbuild, no webpack)

    npm run test:boot-prod                    # MANGLE=1 for mangled; BOOT_ENTRY=/abs/copy-of-index.js for a mutation proof

Pieces: `test/esbuild-options.js` (the shipped options, shared with mode 2), `test/build-boot-prod.js` (bundles the
unchanged `boot.spec.js` into `test/.prod-boot/`; a small esbuild plugin redirects the spec's `../client/js/index.js` to the
real entry or `BOOT_ENTRY`), `test/karma.boot-prod.conf.js`. esbuild keeps the `require` lazy, so the 'in' scenario seeds
state first. With `MANGLE=1`, `__karma__` is reserved because the spec reads karma's own `window.__karma__`.

## 5. Built artifact + real CSP + real service worker (Node >= 22, no extra dependencies)

    npm run test:artifact                     # build, then run. ARTIFACT_MUTATE=wrong-csp|corrupt-bundle|api-500 for mutation proofs

Requires Node >= 22 (global `WebSocket`) and Chrome (`CHROME_BIN`, else the macOS path, else common Linux paths). The
artifact is built **in isolation**: a copy of the repo-root `gulpfile.js`, `package.json` and `.babelrc`, a copy of `client/`
(without specs) and a symlink to `node_modules` live in `.test-artifact/`, and `gulp build` runs there. So the repo's own
`dist/` is never touched, and because the build runs from a directory with no `.env`, the gulpfile's `dotenv` loads nothing.
The result is the exact `gulp build` output for this tree (inlined bundle, CSS, sw.js, manifest, `csp-hash.json`, `.br` files).

`test/artifact/`: `build-artifact.js`; `static-server.js` (dependency-free; serves dist like `server/routes.js` +
`precompressed-static.js`, with the CSP header built from the artifact's own `csp-hash.json`; a drift guard reads
`server/middleware/csp.js` as text and fails if its policy template changed); `cdp.js` (a CDP client and Chrome launcher that
always kills Chrome and deletes its temp profile); `driver.js` (CDP Fetch mocks of `/api/*`, request recording, capture of
console errors, uncaught exceptions and CSP violations; the service worker is never stubbed); `artifact.spec.js`.

Scenarios: (1) logged-out: Login renders, the document carries the artifact's CSP hash, no console errors, CSP violations or
API calls. (2) logged-in: seeded storage, a real click navigates to an entry, a real edit produces the debounced PATCH with the
right body, FAB plus typing produces the POST, no errors. (3) real `sw.js`: registers, controls the page on the second load,
and with the origin server stopped and CDP offline the shell and a deep link render from the service worker's cache.

## Not covered

The real server as a whole (only the precompressed-static middleware has its own spec, `test/server/`; the catch-all route and `express.static` headers are checked by hand), its cookies and sessions, the real `/api` behavior (all mocked at the network layer), gzip and HSTS headers,
visual/layout/CSS correctness (assertions are DOM text and roles; no screenshots), real touch gestures, any browser other than
Chrome and any real device, performance (sizes and timings are reported, never asserted), and the service worker's
update-on-new-version path.
