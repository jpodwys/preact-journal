# kyvo: spec

A tiny UI framework built on one idea: **brute force**. Any state write schedules one
re-render of the whole tree from the root, and a small keyed vdom diff makes that cheap.
That removes per-component scheduling, dirty sets, flush ordering, ancestor/descendant
hazards, subscriptions, context, and read tracking.

Everything below is settled in discussion unless marked OPEN.

## Exports

```js
import { h, render, store, watch } from './core.js'
import { listen, debounced } from './helpers.js'   // userland, tree-shakeable
```

### `h(type, props, ...children)`
Hyperscript / JSX factory. Returns `{ type, props: { ...props, children }, key }`.
`children` is flattened; `null`, `undefined`, `true`, `false` become `''`, which holds the child's position (`0` is kept).
So does any object `h()` did not build: a vnode carries a private symbol, so parsed JSON shaped like a vnode is never
rendered, whether it is passed as a child or returned by a component. The `innerHTML` and `outerHTML` props are ignored; set trusted
HTML through a `ref`. Spreading untrusted data into **props** is still unsafe: it can choose `href`, `style` and any
other prop (see SPREAD-SAFETY.md).

### `render(vnode, hostElement)`
Diffs `vnode` into `hostElement` (first call mounts, later calls diff). It also records
`(vnode, hostElement)` as **the root** that `update()` re-renders. `render(null, host)`
unmounts everything (running mount cleanups) and clears the root. One root at a time:
the most recent `render()` call wins.

### `store(obj)` returns a Proxy
- **Shallow, set-trap only.** Reads are plain reads (no tracking). Values come back by
  identity, never wrapped.
- A write whose value is `Object.is`-equal to the current value does nothing.
- A changed write: stores the value, calls `update()`, then runs `watch` listeners
  synchronously (the store already holds the new value when they run).
- **Convention: replace, don't mutate.** `app.items = [...app.items, x]`.
  In-place mutation (`app.items.push(x)`) is not detected.
- **Dev only (`__DEV__`): deep-freeze on assignment.** Every assigned value that is a
  plain object or array is frozen recursively, so an in-place mutation throws a
  `TypeError` at the offending line. Only plain objects and arrays are frozen (never DOM
  nodes, `Date`, `Map`, `Set`, class instances). Cyclic structures must not hang.
  Stripped from production.

### `watch(store, (key, next, prev) => void)`
Registers a write listener (persistence, `localStorage`, body classes). Runs once per
changed write, in registration order, synchronously. A listener may write to the store
(re-entrancy ends when a write is unchanged). Returns an unsubscribe that removes that registration only. A listener
added or removed during a notification takes effect from the next write.

### `update` scheduling
- `update()` is internal (not exported; export only if a real need appears).
- It schedules **one** `requestAnimationFrame` render if none is pending. All writes in
  a tick (handlers, watchers, mount callbacks, any store, any `ctx.state`) share it.
- The render is never synchronous with the write.
- It re-renders from the root with **no props short-circuit**: every component function
  runs again even when its props are identical.
- With no root (nothing rendered yet, or after `render(null, host)`) a write is a no-op.
- **Dev loop check:** if 25 consecutive flushes were each caused by a write made *during*
  a render, the next flush throws `render loop: "<key>" was written during render 25
  times in a row` naming the last key, and scheduling is reset so the framework still
  works afterwards. A flush with no render-time write resets the count. A component
  writing its own `ctx.state` during its own render never counts (see below).

## Components

```jsx
function Entry(props, ctx) { ... return <div/> }
```
A component is `(props, ctx) => vnode`. It re-runs in full on every render. The second
parameter is always passed; plain components just ignore it.

### `props`
One **live** object per instance. The framework copies the incoming props into the same
object every render (and deletes keys that disappeared), so a callback that outlives a
render reads current values via `props.x`. `children` is included.
**Rule:** destructuring snapshots. Inside a long-lived callback (a `ctx.mount` callback,
a timer, a listener), read `props.x`; do not use a destructured name.

### `ctx`
One plain, persistent object per instance (same identity every render). You may hang
non-reactive fields on it (`ctx.el = el`); writing them never renders. Helpers key
private state on it with their own `Symbol`.

### `ctx.state(init, key?)`
- Returns a persistent per-instance `store` (shallow proxy, same rules as `store`,
  including the dev deep-freeze for assigned values).
- `init` is an object, or a function returning one (called once). Used on the first call
  only; later calls return the same store and ignore `init`.
- Unkeyed = the default slot; put all fields in one object. Extra slots take a `key`
  (string or Symbol). Slots are found by key, **not by call order**, so conditional calls
  are fine.
- **Dev:** claiming the same slot (the same key, or the default) twice in one render
  throws `ctx.state: slot already used this render ...`.
- Writes schedule `update()` unless the owning component is mid-render (own-render
  suppression), so the derive-from-props pattern costs no extra render:
  ```js
  const s = ctx.state({ id: null, text: '' })
  if (s.id !== props.entry.id) { s.id = props.entry.id; s.text = props.entry.text }
  ```
- Writes to the state of an unmounted instance are silent no-ops.

### `ctx.mount(fn)`
- `fn` runs once, after the first commit, with the DOM attached. If it returns a
  function, that runs on unmount (descendants unmount with their ancestors).
- After the whole render pass commits, **every ref runs first, then every mount callback**, each in
  tree order (parent first). So a component's `ctx.mount` can use an element captured by a ref in the same
  component, and that also holds for components first mounted by a state-triggered render.
- **Only the first render registers.** The body re-runs every render, so an
  unconditional `ctx.mount(...)` (or `listen(...)`) is called again on each render; those
  later calls are ignored.
- **Dev:** a later render that calls `ctx.mount` *more* times than the first render did
  throws `ctx.mount: registered after the first render ...` (the conditional-late case).
  It cannot see a same-count swap. This is a known soft spot.
- A throwing mount callback does not stop the others; the first error is rethrown after
  all have run.

### Refs
`ref={el => ...}` callback refs only. Called **after commit** (before any mount callback, so the
element is attached and `el.focus()` works) with the element after it
is created; called with `null` when it is removed; if the callback identity changes
between renders, the old one gets `null` and the new one gets the element. Use a
module-level (stable) ref function for create-only behavior such as focusing.

### The virtual-DOM contract
The DOM is touched only when the **virtual** state changes: text and attributes (including
`value`) are compared with the previous vnode, never with the live DOM. So text a user has
typed into a `contenteditable`, or a value typed into an input, is left alone by unrelated
re-renders and is replaced only when the vnode's own value changes. (Preact 8 compared
`value`/text with the live DOM, which brute-force rendering would turn into reverted typing.)

### Renderer contract (carried over from the earlier mini-preact experiment)
Keyed + unkeyed children diff (DOM nodes and instances follow keys), text updated in
place, SVG subtree via `createElementNS`, `class`, string or object `style`, boolean
attributes, `value`/`checked` as properties, `on*` events (replaced, never duplicated),
null/false children as empty-text placeholders, prop removal between renders. A render that
throws must not leave the framework wedged (mounts must still drain on the next render)
and must drop that render's half-queued mounts.

Details of the renderer (each is covered by `test/renderer.spec.js`; the reasoning and measurements are in `PREACT11-IDEAS.md`):
- **Handlers.** One listener per event name per element, installed once; the current handler lives in a table on the element. A
  new inline function on every render is a property write, not a remove + add. A handler set to `null` is a no-op.
- **Style objects** are diffed per key (changed keys written, removed keys cleared); a string, a missing style, or a switch
  between string and object starts from scratch. `--custom-properties` go through `setProperty`.
- **A changed key replaces** the node or instance, wherever it is: among an element's children, as a component's result, or
  at the root. Type and key must both match to keep it (`null` and `undefined` are both "no key"; keys compare with `Object.is`).
- **Children** match their previous child by key (an unkeyed child's key is its position). A node that was just inserted in place is
  not inserted again. Repositioning uses `moveBefore` when the browser has it (focus, selection and CSS animations survive), else
  `insertBefore`. Dev builds throw on a duplicate key among one element's children (it would otherwise render an extra node).
- **`value` and `checked` are applied after the children** (and after the other attributes), so a `<select value>` finds its
  options and a range input has its `min`/`max`.
- **`list` and `form`** are set as attributes (their DOM properties are read-only).

## Helpers (userland, take `ctx`)
- `listen(ctx, target, event, fn, opts?)`: adds the listener on mount, removes it on unmount
  (`opts` goes to both calls).
  Call it unconditionally at the top level of the body. `fn` is the first render's
  closure, so it must read `props.x`, not destructured names.
- `debounced(ctx, fn, ms, key?)`: returns a trigger that debounces calls to the **latest**
  `fn`, passing it the most recent call's arguments. Timer state lives on `ctx` under a private `Symbol` (non-reactive: firing never
  causes a render by itself). Each `key` (a second use in one component needs one; a changing key such as an
  id works too) has its own timer and pending call. **A pending call is never lost:** on unmount it runs once,
  immediately, with the latest arguments. There is no public flush or cancel.
- `lazy(load, Loading?, Failed?)`: returns a component whose code arrives on first render. `load` returns a promise of the
  component or of a module whose default export it is (`() => import('./stats.js')`; the bundler cuts the `import()` into its own
  file). The load runs once, however many instances there are. While it runs the component renders `Loading` (nothing if
  omitted); if it rejects (or `load` throws) it renders `Failed` with `{ error, retry }`, and `retry()` loads again. Once loaded it
  renders the real component with the same props and children. Each instance writes to its own `ctx.state` when the load
  settles, because a write is what schedules a render. `L.preload()` starts the load early and returns its promise.
  The first instance's `ctx.mount` is what subscribes it to the load, so `lazy` follows the same rule as any `ctx.mount`.

## Actions (convention, no framework support)
Plain module functions that import stores and services. Anything with logic (fetching, syncing,
several fields that must change together) is an action. Components may write a global store
directly for a plain UI flag (`app.dialogMode = 'menu'`); there is no generic setter action. Cross-cutting side effects live in a
single `watch`. After an `await`, read the store again; never capture a store value
before the `await`. Multi-account stale-response guards stay app-level (carry `userId`).

## Non-goals (ignored on purpose)
Attributes that are read-only DOM properties (`list`, `form`, ...; assigning them throws), 
Fragments, portals, context, suspense/hydration, error boundaries, synthetic events,
`className`/`htmlFor` aliases, object refs, `memo`/`shouldUpdate` (see MEMO.md for how to add it), deep reactivity,
read tracking, an exported `update()` (until needed).

## OPEN
- Whether `listen` should call the first-render `fn` or the latest (currently first).
- Final dev-loop threshold (25) and message wording.
- Real size: measure `dist/index.html.br` after porting `Entry`, `VirtualScroll`, `Router`.
