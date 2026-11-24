# kyvo

A tiny UI framework (about 1.8 KB brotli) built on one idea: **brute force**. Any write to a store
schedules one re-render of the whole tree from the root on the next animation frame, and a small keyed
vdom diff keeps that cheap. There are no subscriptions, no hooks, no dependency arrays, no context, and no
per-component scheduling, because nothing needs to know *what* changed.

```jsx
import { h, render, store } from './ui/core';

const app = store({ count: 0 });                      // global state: a plain object

const Counter = (props, ctx) => {
  const s = ctx.state({ clicks: 0 });                 // local state: also a plain object
  return (
    <button onclick={() => { app.count++; s.clicks++; }}>
      {props.label}: {app.count} total, {s.clicks} from here
    </button>
  );
};

render(<Counter label="Clicks" />, document.body);
```

[SPEC.md](SPEC.md) is the normative contract (every edge case); this README is the guide. For a worked
example see the journal app in `client/`, and for a second, different app see `examples/tasks/`.

## Contents

[Setup](#setup) · [Mental model](#mental-model) · [API](#api) · [Patterns](#patterns) · [Rules and footguns](#rules-and-footguns) ·
[Dev vs production](#dev-vs-production) · [Types](#types) · [Testing](#testing) · [Not included](#not-included) · [Repository, tests and results](#repository-tests-and-results)

## Setup

The framework is two plain ES modules, `core.js` and `helpers.js` in this folder (copy them into your
tree). JSX needs the `h` factory in scope and no fragment support (see [Not included](#not-included)).

esbuild:

```js
esbuild.build({
  entryPoints: ['src/index.js'], bundle: true, minify: true, outfile: 'dist/bundle.js',
  loader: { '.js': 'jsx' }, jsx: 'transform', jsxFactory: 'h',
  define: { __DEV__: 'false' },   // production: strips every dev-only check (see below)
});
```

Leave `__DEV__` undefined while developing and tests run with all dev checks on. Every dev check is guarded by
`typeof __DEV__ === 'undefined' || __DEV__`.

## Mental model

1. **State lives in plain objects.** `store(obj)` and `ctx.state(obj)` return a proxy over `obj`. Read it as normal;
   assign a field to change it.
2. **A changed assignment schedules one render.** Assigning a value that is not `Object.is`-equal to the current
   one marks the app dirty; the first write in a tick requests an animation frame, later writes share it.
   Assigning an equal value does nothing.
3. **A render re-runs everything.** From the root, every component function runs again (reading whatever stores it
   likes) and a keyed diff updates only the DOM that actually changed.
4. **Components are re-run, so they are plain functions.** `(props, ctx) => vnode`. Anything that must survive a
   render lives in `ctx.state`, a store, or on `ctx`.

Consequences worth internalizing: reads need no subscription (any component can read any store by importing it);
writes are synchronous but rendering never is (a write does not change the DOM until the next frame); and
renders are cheap because the diff touches only what changed, but they are not free (see
[`memo`](MEMO.md) for the escape hatch you can add).

## API

### `h(type, props, ...children)`

The JSX factory. Returns `{ type, props: { ...props, children }, key }`. `children` is flattened;
`null`, `undefined`, `true` and `false` are dropped, `0` and `''` are kept.

### `render(vnode, hostElement)`

Mounts `vnode` into `hostElement`, or diffs it against what is there on later calls. It also records
`(vnode, hostElement)` as **the root** that store writes re-render, so call it once for your app. Existing
children of the host that the framework did not create are left alone (the app renders into `document.body`).
`render(null, host)` unmounts everything, running cleanups. It is synchronous, which is also how tests force a
render.

### `store(obj)`

Returns a proxy over `obj`. Shallow: only direct assignments are detected. Reads return the stored value itself
(never a wrapper), so values are safe to hand to IndexedDB, `structuredClone`, or `===` comparisons.

```js
export const app = store({ view: '/', entries: [] });
app.view = '/search';                          // schedules a render
app.entries = [...app.entries, entry];         // replace values, never mutate them
app.entries.push(entry);                       // NOT detected (and throws in dev: values are frozen)
Object.assign(app, { view: '/', filter: '' }); // each key goes through the proxy; still one render
```

### `watch(store, (key, next, prev) => {})`

Calls the function synchronously after every changed write, with the store already holding the new value.
Use it for derived state, persistence, and side effects that should happen on every write no matter who made it:

```js
watch(app, (key, next) => {
  if (key === 'entries') idbSet('entries_' + app.userId, next);
  if (key === 'dark') document.body.classList.toggle('dark', next);
});
```

A listener may write to the store; the loop ends when a write is unchanged. There is no unsubscribe.

### Components

```jsx
const Entry = ({ entry, onSave }, ctx) => <div>...</div>;
```

A component is a function `(props, ctx) => vnode`. It runs again on every render, so it must be cheap and free of
side effects other than reading. Return `null`/`false`/`undefined` for nothing. A component returns **one** vnode
(wrap siblings in an element); returning an array throws.

- **`props`** is one **live** object per instance: the framework copies the incoming props into the same object on
  every render and deletes keys that disappeared. So a callback that outlives a render (a timer, a listener)
  can read `props.x` and always sees the current value. Destructuring copies the value, so a destructured name
  inside such a callback is a stale snapshot (see [Rules](#rules-and-footguns)). `children` and `key` are in `props`.
- **`ctx`** is one plain, persistent object per instance (same identity every render). Put non-reactive per-instance
  values on it (`ctx.timer = ...`, `ctx.el = el`); writing them never renders. It also carries the two methods below.

### `ctx.state(init, key?)`

Returns a persistent per-instance store (same rules as `store`, including frozen assigned values in dev). `init` is an object, or a function
returning one (called once). It is used on the first call only; later renders get the same store and ignore `init`.

```jsx
const s = ctx.state({ editing: false, draft: '' });
const stats = ctx.state({ added: 0 }, 'stats');   // a second, independent slot needs a key (string or Symbol)
```

Put all of a component's fields in one object. A second unkeyed call in the same render throws in dev. Slots are
found by key, not by call order, so conditional calls are fine. Writes schedule a render, except a write to a
component's own state *during its own render* (so the derive-from-props pattern costs no extra render).

### `ctx.mount(fn)`

`fn` runs once, after the first render commits and the DOM is attached. If it returns a function, that function
runs when the component unmounts (descendants unmount with their ancestors, parent first).

```jsx
ctx.mount(() => {
  const t = setInterval(() => props.onTick(), 1000);
  return () => clearInterval(t);
});
```

Only the first render registers: the body runs every render, so an unconditional `ctx.mount(...)` (or
`listen(...)`) is called again each time and the later calls are ignored. **`fn` closes over the first render**, so it
must read `props.x`, not destructured names. Registering *more* mounts than the first render did throws in dev (the
conditional-late case); it cannot see a same-count swap. An exception in one mount callback does not stop the others; the first is rethrown.

After each commit the framework runs **every ref first, then every mount callback** (each group in tree order, parent first),
so a component's `ctx.mount` can use an element a ref in the same component captured (`ctx.el`), and a parent's mount sees its
children's refs already set.

### Refs

`ref={el => ...}` on an element. Called after commit (so the element is attached and `el.focus()` works) with the
element when it is created, and with `null` when it is removed. All refs of a commit run before any `ctx.mount` callback. If the callback's identity changes between renders,
the old one gets `null` and the new one gets the element, so an inline arrow re-fires every render. For
create-only behavior (focus, one-time measurement) use a module-level function or one stored on `ctx`:

```jsx
const focusEl = el => { if (el) el.focus(); };       // module level: runs once per element
<input ref={focusEl} />
```

On a *component*, `ref` is an ordinary prop (the framework never calls it), so forwarding is free:
`const Field = props => <input ref={props.ref} />`.

### Attributes, events and styles

- Names matching `on*` are events (lowercased, so `onclick` and `onClick` both work); a changed handler is replaced,
  never duplicated; `null` removes it.
- For other names, a DOM **property** is set when the element has one (`value`, `checked`, `disabled`, `href`, `id`, ...),
  otherwise an attribute (`class`, `aria-*`, `contenteditable`, SVG attributes). `null`/`false` removes the attribute.
- `style` is a string or an object. Object values are used as-is, so numbers need units (`top: '40px'`, not `top: 40`).
- SVG subtrees are created in the SVG namespace automatically.
- **Text and attributes are compared with the previous vnode, never the live DOM.** Text a user typed into a
  `contenteditable`, or a value typed into an input, is left alone by unrelated re-renders and replaced only when the
  vnode's own value changes.

### Keys

Children match by `key` (any string or number; `0` is a valid key, `1` and `'1'` are different keys). An unkeyed
child matches by position. Give list items stable keys.

### `listen(ctx, target, event, fn, opts?)` (helpers)

Adds `fn` as a listener on mount and removes it on unmount (`opts` goes to both calls, e.g. `{ passive: true, capture: true }`).
Call it unconditionally at the top of the body. `fn` is the first render's closure: read `props.x`.

### `debounced(ctx, fn, ms, key?)` (helpers)

Returns a stable trigger that debounces calls to the **latest** `fn`, passing it the most recent call's arguments.
The timer lives on `ctx` (non-reactive: firing it never renders by itself). A second use in one component passes a `key`.

```jsx
const search = debounced(ctx, e => setQuery(e.target.value), 100);
<input oninput={search} />
```

**A pending call is never lost:** if the component unmounts, it runs once, immediately, with the latest arguments. That is what
makes it safe for saves: an edit made just before navigating away still gets saved. Each `key` has its own timer and pending call
(a changing key works too), so give a save the id it belongs to and switching items can never replace another item's pending save:

```jsx
const save = debounced(ctx, saveEntry, 500, String(entry.id));   // one timer per entry
<div contenteditable oninput={e => save(e, entry)} />
```

## Patterns

**Derive local state from props** (replaces "effect on prop change" and `getDerivedStateFromProps`): plain code in the body.

```jsx
const s = ctx.state({ id: undefined, text: '' });
if (s.id !== props.entry.id) Object.assign(s, { id: props.entry.id, text: props.entry.text });
```

**Run work only while something exists** (replaces effects with dependency arrays): render a small component only
while the work should run; its `ctx.mount` starts it and the cleanup stops it.

```jsx
{running && <Ticker onTick={tick} />}               // Ticker's mount sets the interval; its cleanup clears it
{modal && <Confirm id={modal.id} />}                // Confirm's `listen` exists only while the dialog is open
```

**Re-run work when an id changes** (replaces effects keyed on a dependency): key the component by that id. A new key
is a new instance, so its `mount` runs again and the old instance's cleanup cancels stale work (this also fixes
races for free).

```jsx
<Detail key={task.id} id={task.id} />               // Detail's mount fetches; its cleanup ignores a late response
```

Without the `key`, the first render's `id` stays in the `mount` closure and the details silently show the wrong
task. Nothing warns you.

**Actions are plain functions** that import the store and write to it. There is no `dispatch`, `fire` or context. Keep
side effects that must accompany *every* write (persistence, computed fields) in a `watch`, so no action can forget them.

```js
export function toggleFavorite({ id }) {
  app.entries = app.entries.map(e => e.id === id ? { ...e, favorited: !e.favorited } : e);
}
```

After an `await`, read the store again; never use a value captured before it.

**Derived data** is a function of the store (`const visible = () => app.entries.filter(...)`) computed in the
component. If it is expensive and read in many places, memoize the function on its inputs (the journal app's `viewEntries()` does) rather than storing
the result in a field: a stored derived field can be assigned, and then it is silently wrong until an input next changes.

**Contenteditable and uncontrolled DOM**: keep a local `ctx.state` copy seeded when the item's id changes and render
that, so re-renders never touch the text the user is typing; key the editable element by the item's id.

## Rules and footguns

| Rule | If you break it | Caught? |
|---|---|---|
| Replace store values; never mutate them in place | The change is not detected, so nothing re-renders | Dev: values are deep-frozen, so it throws a `TypeError` at the line. Production: silent |
| In long-lived callbacks (`mount`, timers, listeners) read `props.x`, not destructured names | You act on the first render's value forever | No |
| `ctx.mount`/`listen` are registered by the first render only; do not call them conditionally | A late registration is dropped | Dev: throws when a later render registers more than the first did; not a same-count swap |
| One unkeyed `ctx.state` per component; extra slots need a key | The second call throws | Dev only |
| Re-run mount-time work by keying the component | Stale closure (shows the old id) | No |
| Numeric style values need units | The browser ignores `top: 40` | No |
| A component returns one vnode; no fragments | Throws (a cryptic `reading 'ref'` error for arrays) | At render |

## Dev vs production

Define `__DEV__` as `false` for production and these are removed from the bundle entirely: deep-freezing of
assigned store values, the duplicate-slot and late-mount checks, and the render-loop guard. Dev also has this
**render-loop guard**: if 25 consecutive renders were each caused by a store write made *during* a render, the next
one throws `render loop: "<key>" was written during render 25 times in a row`, naming the key. A component writing its own
`ctx.state` during its own render never counts.

Specs that assert a dev-only behavior should skip themselves in a production-shaped bundle (see `devOnly` in
`test/mount.js` at the repo root).

## Types

`core.d.ts` and `helpers.d.ts` sit next to the JS files, so TypeScript and editors (VS Code etc.) pick them up automatically
for relative imports, with no build step and zero bytes added to the bundle (they are never bundled). They need TypeScript
5.1 or newer. You do not have to convert anything: the app can stay plain JS and opt in with `// @ts-check` per file or
`"checkJs": true` in a `tsconfig.json` (`"allowJs": true, "jsx": "react", "jsxFactory": "h", "noEmit": true`).

What they give you while authoring:

- **Autocomplete and checking for `ctx`, stores, helpers and JSX.** `ctx.` offers `state` and `mount`; local state and store
  fields complete from their initial objects; `<input ` offers its real attributes and `oninput`/`onInput`; event
  handlers get a typed event (`e.currentTarget.value` on an input, `e.key` on `keydown`); `listen(ctx, window, '` completes
  window event names; style objects complete CSS properties.
- **The "replace, don't mutate" rule at compile time.** Store reads are deeply `readonly`, so `app.entries.push(x)` and
  `app.entries[0].text = 'y'` are type errors in the editor (the dev-mode freeze catches them only at runtime and production not at all).
  Top-level assignment (`app.entries = [...app.entries, x]`) and copying methods (`slice`, `map`, spread) still type-check.
- **Typos and wrong types:** `ctx.statee`, `s.edting`, a misspelled store field, `app.dark = 'yes'`, an unknown tag or
  attribute, `value={5}`, an event name that does not exist, and numeric styles (`top: 40` is an error: write `'40px'`).
- **Returning an array or `true` from a component** is a type error (it throws at runtime).
- **`watch` narrows by key:** `watch(app, (key, next) => { if (key === 'dark') next /* boolean */ })`.

Things you set up once:

```ts
// app-types.d.ts
import './ui/core';
declare module './ui/core' {
  interface Ctx { el?: HTMLElement | null }              // fields you hang on ctx (ctx is open at runtime, closed in types)
}
declare global {
  namespace JSX { interface IntrinsicAttributes { path?: string } }   // props a parent consumes (Router's `path`)
}
```

In plain JS, a function `(props, ctx) => ...` leaves `ctx` as `any`, so nothing is checked until you give it a type. One JSDoc
comment per component that uses `ctx` fixes that:

```js
/** @param {{ items: readonly Entry[], rowHeight: number }} props
 *  @param {import('../../packages/kyvo/core').Ctx} ctx */
export default ({ items, rowHeight }, ctx) => { ... }
```

Because store reads are `readonly`, data you pass down through props must be declared `readonly Entry[]`, not `Entry[]`.
For a store the initial value shapes the type, so `store({ entry: undefined })` types `entry` as `undefined`: write
`store(/** @type {State} */ (initial))` or `store({ entry: /** @type {Entry | undefined} */ (undefined) })` when a field starts empty.

**Limits:** types cannot express the runtime rules that need execution (a destructured name in a `mount` callback is stale,
`mount` registers only on the first render, a missing `key`), so those still rely on the dev checks and this README. A
local helper that takes an untyped argument (`const set = delta => Object.assign(app, delta)`) erases the store's typing at that boundary.
JS destructured parameters are inferred as *required*, so optional props need JSDoc (or TypeScript).

**How this was verified** (`npm run test:types` from the repo root, needs `TS_PATH` pointing at a TypeScript install; the repo does not depend on one):
(1) `positive.tsx` must compile cleanly and every `@ts-expect-error` line in `negative.tsx` (about 45 mistakes) must be a real error;
(2) TypeScript's language service, the engine behind editor autocomplete, is driven at cursor positions (21 assertions on
completions, hovers and diagnostics); (3) the real journal app is type-checked unannotated, then with seeded mistakes: **4 of 8
seeded mistakes are caught in plain JS, and 7 of 8 with one JSDoc line on each of the 3 components that use `ctx`**
(the 8th goes through an untyped helper). The first runs found real bugs in the declarations themselves, now fixed:
two-parameter `watch` listeners did not type-check, `{cond && <X/>}` was rejected as a child, every untyped component demanded
`children`, `HTMLFormElement`'s index signature turned all attributes into `any`, and a catch-all SVG type hid typos.

## Testing

Mount into a detached `div`, drive it with real events, and assert on the DOM, the store, and fetch.

- Renders are deferred to `requestAnimationFrame`. Wait with a helper (a microtask plus two frames): `await settle()`.
- `render(vnode, host)` is synchronous. A harness can dispatch a real event and then re-render every mounted root so a
  spec can assert immediately after a click. Timers, promises, and direct store writes from a spec still need `await settle()`.
- The store is a module singleton: reset it per test (the journal app has `resetState()`), and unmount in `afterEach`.
- Faking timers with sinon: pass `toFake: ['setTimeout', 'clearTimeout']` (or `setInterval`/`clearInterval`) and do **not**
  fake `requestAnimationFrame`, or the framework's scheduler can get stuck.
- Chrome silently drops `history.replaceState/pushState` after about 200 calls in 10 seconds; a long suite needs
  `--disable-ipc-flooding-protection`.
- A re-render after the test finished can leak into the next test: let the frame drain in `afterEach`.

## Not included

On purpose, in the spirit of "ignore problems we don't have": fragments and array returns, portals, context, suspense/hydration,
error boundaries, synthetic events, `className`/`htmlFor` aliases, object refs, deep reactivity, read tracking,
effect dependency arrays, an unsubscribe for `watch`, an exported `update()`, and attributes that are read-only DOM properties (`list`,
`form`). `memo` was built, measured, and removed; [MEMO.md](MEMO.md) is the recipe to add it back. There is no
server rendering story.

## Repository, tests and results

- `core.js`, `helpers.js`, `core.d.ts`, `helpers.d.ts`: the framework and its TypeScript declarations (this folder).
- `test/`: 121 framework specs (including a seeded keyed-diff fuzz) plus the build, karma config and size script that run them.
- `types-test/`: the type tests (`positive.tsx`, `negative.tsx`, an editor-behavior check and a seeded-mistakes run over the journal app).
- `examples/tasks/`: a second, different app on kyvo (26 specs).
- The journal app in `client/` is the main consumer, with the app's own test infrastructure in `test/` at the repo root.

### Run

From the repo root: `npm run test:kyvo` (the framework's specs in dev, minified and mangled modes), `npm run test:examples`, `npm run test:types`
(set `TS_PATH` to a TypeScript >= 5.1 install; the repo does not depend on one), and `npm test` / `npm run test:all` for the app's five layers.
Framework size: `node client/packages/kyvo/test/size.js`.

The app's five test layers (headless Chrome, with `CHROME_BIN` set if Chrome is not found):

| Layer | Command | Result |
|---|---|---|
| 1 normal suite | `npm test` | 388 |
| 2 minified prod bundle | `npm run test:prod` | 386 (+2 dev-only skipped) |
| 3 boot (source) | `npm run test:boot` | 1 + 1 |
| 4 boot (minified) | `npm run test:boot-prod` | 1 + 1 |
| 5 built artifact (real gulp, CSP, sw.js, over CDP) | `npm run test:artifact` (Node >= 22) | 3 |

`SPECS=components/entry,js/utils npm test` runs a subset of layer 1 (paths under `client/`).

### Size (same gulp pipeline, `__DEV__` false, brotli q11, nothing mangled)

Measured when the app moved to kyvo. The Preact 8 front end it replaced is in this repo's git history, and mini-preact (the runner-up experiment, a Preact-8-compatible renderer)
is not part of the repo; its row is kept as a baseline.

| | `dist/index.html.br` | JS bundle br | framework alone br |
|---|---|---|---|
| Preact 8 front end (before) | 12,160 | 10,374 | 3,148 |
| mini-preact (experiment) | 10,701 | 8,911 | 1,748 |
| kyvo | **9,950** | **8,134** | **1,583** |

(Against the Preact 8 build that was actually deployed, the served page was 12,041 B, so the real saving was 2,087 B, 17.3%.)
Still one inlined `index.html` (single script, no `src`). With `mangleProps /^_/` (an experiment, not what ships)
the three are 12,065 / 10,631 / ~9,910. Performance: the journal app re-renders in about 0.5 ms with 20,000 entries (VirtualScroll caps the rows).

Since then the renderer took the ideas in `PREACT11-IDEAS.md` (handler table, per-key style diff, `moveBefore`, `value`/`checked`
after children, `list`/`form` as attributes): fixes for `<select value>`, range inputs, CSS custom properties, `<input list>` and
focus on a moved row. (Lazy positional child matching was adopted, measured at a 10-15% gain on large plain lists, and removed
again: +102 B for something virtualization and `memo` already cover.) Sizes are in `node test/size.js`.

### Real bugs the port found (several exist in the original app too)

- A pending debounced save wrote into whichever entry was on screen when it fired (type, then Next within 500 ms).
- Replaying a queued offline delete at boot navigated the user to /entries.
- A boot replay of a queued create replaced the entry on screen.
- Framework: removing a string `style` did not clear it; a stale detached text node could be re-inserted
  after a contenteditable edit; falsy `0` was read as a key; unitless numeric styles are ignored (VirtualScroll needed `px`).

### Known limits / not verified

- Entry shares one debounce timer between its date and text fields, so editing the date and then the text within 500 ms saves only
  the text (inherited from the original). Saves are no longer lost by leaving the entry or switching to another one within
  the window (the pending save runs on the way out, and each entry has its own timer; there are specs, including an end-to-end journey).
- Text typed while a create POST is pending is not sent (inherited from the original).
- Known bug (pre-existing, found while auditing, not fixed): typing in a brand-new entry and leaving within 500 ms loses it. The route
  handler discards the still-blank new entry before the Entry unmounts and runs its pending save, so the save has nothing to attach to
  (the same journey fails on the code from before the audit).
- A failed login shows the user nothing and leaves an unhandled promise rejection (pre-existing). The 401 worry is not reachable
  today: the server answers a bad password with 400 and rate limiting with 429, and only authenticated routes return 401; but
  login passes no `skipAuth`, so a future 401 there would expire the active account.
- Not run: the app test layers against a mangled bundle; any manual click-through on a real device.
