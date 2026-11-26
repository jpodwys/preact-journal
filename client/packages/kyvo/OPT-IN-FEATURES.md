# Opt-in features that need core code

**Status: a design note. Nothing here is built.** It records what we could add to kyvo without making anyone download it unless they ask,
what that would take, and where it stops being a good idea. Sizes marked *measured* come from [MEMO.md](MEMO.md) and
[RENDER-IDEAS.md](RENDER-IDEAS.md); everything else is an estimate or unknown and says so.

## Two different things

kyvo's helpers (`listen`, `debounced`, `lazy`) are **tree-shakeable exports**. They live in `helpers.js`, take `ctx`, and need nothing from the
core. An app that never imports one does not ship it. That is automatic, and it is how `lazy()` costs about 160 B in a bundle that uses it and nothing
in one that does not.

This document is about something else: **features that need code inside `core.js` itself**, in the render loop, the store or the scheduler.
A tree-shaker cannot remove that code, because the core does not know whether the app uses the feature. `memo` is the example. Its helper is
tree-shakeable (about 84 B), but it only works if the diff has a line that skips an unchanged memoized subtree, and that line costs every app
about 6 to 17 B whether or not it ever calls `memo` (*measured*, MEMO.md).

The goal: make that core code **cost nothing unless the app opts in**.

## The mechanism

kyvo already does this once. Dev-only checks are written as `typeof __DEV__ === 'undefined' || __DEV__`, and a production build defines
`__DEV__: false`, so the minifier deletes them. Opt-in features reuse the idea with the default reversed:

```js
// in core.js, inside the diff
if (typeof __MEMO__ !== 'undefined' && __MEMO__ && old === vnode && vnode.m) return i;
```

An app turns the feature on with `define: { __MEMO__: 'true' }` in its bundler config, and the line stays. With `false` the minifier removes it.

### The catch: "undefined means off" does not shrink anything on its own

`__DEV__` is free in production because the build *defines* it. If an opt-in flag is simply *not defined*, `typeof __MEMO__ !== 'undefined'` is evaluated at
runtime, so the check ships in the bundle (a few dozen bytes per feature). **The zero-cost promise holds only when the build defines every flag, false by default.**
Two consequences:

- A shared build preset (see the gaps list in the project discussion: one exported options object for `jsxFactory`, `define`, `mangleProps`)
  has to define all feature flags to `false` unless the app turns them on. Apps that hand-write their bundler config and do not define the flags get a working framework with
  a few extra bytes, not a broken one. That is why the guard uses `typeof` rather than a bare identifier: unbundled use (karma, a raw ES module in a browser) must not throw a `ReferenceError`.
- Size claims for each feature must be measured with the flag defined both ways, by `test/size.js`, before the feature is documented as free.

## Which features fit

The line that matters is whether the feature is **additive** or changes the **mode** of existing code.

- **Additive**: only code that calls a new API reaches it. Turning the flag off removes a path nobody on that side can take. There is nothing to fork.
- **Mode**: it changes how code the app already has behaves. A flag makes two frameworks. A bug in the off mode is invisible to everyone running the on mode, the
  docs and types diverge, and the test matrix doubles.

| Feature | What the core needs | Kind | Size | Evidence |
|---|---|---|---|---|
| `memo(C)` (hand-written) | one diff line: skip an unchanged memoized vnode | additive | about +6 to 17 B core, about 84 B helper | *measured* |
| Fragments and array returns | accept an array as a component's result | additive | not measured | not built |
| Error boundaries | try/catch around the component call, plus a `ctx` hook to catch | additive | not measured | not built |
| Exit transitions | keep a removed node in the DOM until its animation ends | additive, but invasive in the diff | not measured, likely the largest | not built |
| Dev-only tools (inspector, render counts, a profiler) | nothing beyond `__DEV__` | additive | zero in production already | not built |
| Portals | possibly multiple roots (the core appears to keep one) | unknown | not measured | **not checked** |
| Automatic memo by read recording | read hooks in the store | mode | **+232 B** | *measured*, RENDER-IDEAS.md |
| `ctx.state` writes re-render only that component | scheduler change | mode | **+110 B** | *measured*, RENDER-IDEAS.md |
| Subscription tracking (a write re-renders only its readers) | read tracking, unsubscribe, ordering | mode | estimated **+300 to 450 B** | design only |
| Selector memo `memo(C, select)` | as memo, plus dependency selection | additive on top of memo | estimated +130 to 170 B | design only |
| Batched store writes (`patch(store, delta)`) | defer watcher calls until every key is applied | a correctness fix | small, not measured | not built |

### Recommendations

- **Flag the additive rows.** `memo` first (it is the cleanest and already measured), then fragments and error boundaries.
- **Do not flag the mode rows.** If automatic memo or component-level `ctx.state` re-rendering is ever adopted, adopt it as the default. A switch that changes behaviour is a fork.
- **Batched writes should be default-on, not a flag.** It fixes a footgun, not a preference: `Object.assign(app, { entries, userId })` runs watchers key by key, mid-update, so a watcher can see
  half-applied state. This bit the journal app twice (a persistence watcher saw the new `entries` while `userId` was still the old account's, and overwrote that account's cache).
- **Portals need a look before deciding.** If they can be built as a helper that renders into a second host, they are a tree-shakeable export and not a core feature.

## Guard rails

- **Dev error when the helper is present and the core flag is off.** A `memo()` imported into a build without `__MEMO__` would otherwise do nothing, silently. In dev it should throw,
  naming the flag.
- **Types cannot follow a build flag.** `memo` is always in `helpers.d.ts`, so the dev error above is what protects people.
- **Test the matrix that matters, not every combination.** Everything on, everything off, and each additive flag alone. The existing three modes (dev, minified, minified and mangled)
  run against the all-on build, and the size script prints a row for each flag defined both ways.
- **Document the flag next to the feature**, and in the core at the line it guards.

## Automatic detection (optional, later)

Setting flags by hand works. A small build plugin could set them from the import graph: build once with a metafile, see that some module imports `memo`
from kyvo, then rebuild with `__MEMO__: true`. It costs one extra build and fits naturally in the shared build preset. The cautions:

- The scan has to cover **every chunk, including dynamic imports**. If `memo` is imported only inside a lazily loaded page, the entry chunk's core still needs the line.
  One esbuild call covers it; separate builds fail silently.
- A third-party component that imports `memo` turns the feature on for the whole app. That is the right behaviour, and it can surprise someone reading a bundle-size diff.
- It sees `import { memo }` and nothing cleverer, so the dev error above stays as a backstop.
- An explicit `__MEMO__: false` should still force it off.

None of this exists yet. The explicit flags come first; the plugin is a convenience on top.

## Suggested order

1. The flag mechanism and the build preset that defines every flag false, with `memo` as the proof (size row both ways, the dev error, specs in all three modes).
2. Batched writes (`patch`), default-on.
3. Fragments and error boundaries, each behind its own flag, each measured before it is called free.
4. The import-graph plugin.

## Open questions

- How many bytes does each flag's guard cost when the flag is *not* defined? (Needed to say what an app with a hand-written build config pays.)
- Can portals be a helper? (Check whether `render()` can drive a second root.)
- Should exit transitions exist at all, or is the CSS-class-plus-timer approach the journal uses (`fresh`) enough? It is the largest and least certain item.
