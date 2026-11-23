# Adding `memo` to this app (if you ever want it)

`memo` was built and measured, then removed because this app does not need it. This file is
the complete recipe to put it back: three small edits to the framework, one edit to the app, the tests to
add, and how to tell whether you need it at all. The steps below were applied to this tree, the suite was
run, and they were reverted.

## What it is

`memo(Component)` returns a component that **skips running `Component` and its whole subtree when its props are
shallow-equal to the previous render's**. Without it, every store write re-runs every component in the tree
(that is the framework's brute-force design, and it is fast enough here).

## Do you need it? Measure first

The journal app re-renders in about 0.5 ms with 20,000 entries because `VirtualScroll` renders only the rows
near the viewport (roughly 60). Measured in headless Chrome on a laptop:

| Scenario | Plain | With memo |
|---|---|---|
| This app, one root re-render, 100 to 20,000 entries | 0.1 to 0.5 ms | not needed |
| 1,000 pure rows (no virtual scroll), one row changed | 17 ms | 1.5 ms |
| 3,000 pure rows | 50 ms | 4.5 ms |

Roughly 1,000 plain rows per 16 ms frame on that machine; expect several times fewer on a phone.
Reach for memo when a profile shows long renders and you have a large list of **pure** row components that
is not virtualized (for example if you remove `VirtualScroll`, raise its overscan a lot, or add another long list).

To measure your own case, add a throwaway spec (not part of the suite) that times `env.flush()` or `render(view(), host)`
over about 25 runs after 5 warmups and takes the median; compare plain against `memo(Row)`.

## What it may and may not wrap

`memo` is only correct for a component whose output depends on its **props alone**. A skipped component is never
re-run, so anything else it depends on silently goes stale:

- It must not read a store (`app`, `tasks`, ...). A store write re-renders the root, but the skipped component
  does not re-run, so it keeps showing old data. Pass what it needs as props from a parent that does read the store.
- It must not hold `ctx.state`: its own writes could never re-render it.
- It must not take `children` (new vnodes every render, so equality could never hold).
- It should not depend on anything else that changes outside props (module variables, `Date.now()`, DOM reads).

In this app `EntryPreview` is the one good candidate: it takes `entry` and `filterText` and reads nothing else
(the share icon checks `navigator.share`, which never changes; the `slideIn` timer in its body only needs to run when
its `entry` changes, and clearing `slideIn` replaces the entry object, so it does). Header, Entry, DialogWrapper,
Search, Entries and Router all read the store, so they must NOT be memoized.

## The three framework edits

### 1. `client/packages/kyvo/core.js`: skip an unchanged memo'd vnode

In `diffInternal`, as the first line inside the same-type branch (`else if (old && old.type === vnode.type) {`):

```js
    if (old === vnode && vnode.m) return i; // a memo()'d vnode that is unchanged: skip its whole subtree
```

The `vnode.m` flag matters: the root vnode is the *same object* on every flush (`render(root[0], root[1])`),
so an identity check alone would skip the whole app.

### 2. `client/packages/kyvo/core.js`: dev check against state in memo'd components

At the top of the `__DEV__` block inside `proto.state`, before the `const u = ...` line:

```js
      if (this._vnode.m) throw new Error('ctx.state: a memo() component cannot hold state (its writes would never re-render it)');
```

### 3. `client/packages/kyvo/helpers.js`: the helper

Add `import { h } from './core';` at the top, and at the bottom:

```js
const shallow = (a, b) => {
  for (const k in { ...a, ...b }) if (k != 'children' && a[k] !== b[k]) return;
  return 1;
};

// memo(Component, equal = shallow): skips re-running Component (and its whole
// subtree) when its props are equal to the last render's. ONLY for components
// whose output depends on props alone (see MEMO.md).
export const memo = (C, equal = shallow) => (props, ctx) => {
  const m = ctx[K];
  if (m && equal(m.p, props)) return m.v;
  if ((typeof __DEV__ === 'undefined' || __DEV__) && props.children.length) throw new Error('memo(): a memoized component cannot take children');
  const v = h(C, props);
  v.m = 1;
  ctx[K] = { p: { ...props }, v };
  return v;
};
```

How it works: the wrapper keeps the last props snapshot and the vnode it produced on `ctx` (under the module's
existing private `K` symbol). If the new props are equal it returns the **same vnode object**; the diff sees
`old === vnode` with the flag set and returns without touching the subtree. Otherwise it builds a fresh vnode.
Cost: about 84 B brotli when imported (tree-shaken when not), plus roughly 6 to 17 B for the core check.

## The one app edit

`client/components/entries/index.js`:

```js
import { memo } from '../../packages/kyvo/helpers';
import EntryPreview from '../entry-preview';

const Row = memo(EntryPreview);

const renderer = filterText => items =>
  items.map(entry => <Row entry={entry} filterText={filterText}/>);
```

Rows stay keyed by `entry.id` inside `EntryPreview`'s own markup as before; the wrapper itself gets the `key`
from the list (`<Row key={entry.id} .../>`) if you want keyed matching at the list level. The existing list does
not key the previews, so rows match by position, exactly as today.

## Tests to add

Framework (`test/helpers.spec.js`, import `memo`, `store`, `devOnly`): these were the cases the original suite covered.

- Skips re-running while props are shallow-equal (count renders across several root re-renders).
- Re-runs when any prop changes, and when a prop is added or removed.
- In a keyed list, changing one row re-runs only that row (`runs` counter per id).
- Keeps working through keyed reorders and removals.
- Accepts a custom equality function.
- Unmounting a memoized component still runs its `ctx.mount` cleanup.
- **Pins the hazard on purpose:** a memoized component that reads a store does NOT update after `store.n = 5` (assert it still shows the old value).
- A memoized component updates from props passed by a store-reading parent.
- `devOnly`: throws for children and for `ctx.state`.

App (`client/components/entries/index.spec.js`): after seeding entries, change one entry through the real
`updateEntry`/`toggleFavorite` action and assert (a) the changed row's text/icon updates and (b) the other rows'
DOM nodes are the same elements as before (`const before = [...host.querySelectorAll('.entry-preview')]`, compare after
`await settle()`).

Run `npm run test:all` afterwards (see the root README); `test:prod` also verifies the minified, `__DEV__`-false build.
