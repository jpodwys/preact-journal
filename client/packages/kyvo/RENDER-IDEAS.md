# Render optimization ideas for kyvo: built, measured, and not built

kyvo re-renders the whole tree on every store write and diffs. That is the design, and it is fast enough for the journal (a
root render is about 0.5 ms with 20,000 entries because `VirtualScroll` renders about 60 rows). This file records every
idea we explored for making renders cheaper, what each cost, what it bought, and, for the ones we built, **how to put them back**.
None of them is in `core.js`. Nothing here is a recommendation to add one; it is so the next person does not redo the work.

All measurements: Apple M4 Mac mini, headless Chrome 157, one run at a time. `x4` = Chrome CPU throttling rate 4 (a rough
stand-in for a mid-range phone). Sizes are brotli q11. Medians unless noted. Single runs differ by about 5%.

## Summary

| Idea | Status | Size | What it buys | Main risk |
|---|---|---:|---|---|
| **Hand-written `memo(C)`** | built, measured, removed; recipe in [MEMO.md](MEMO.md) | about +100 B | 1.0 to 4.7x on big lists of pure rows | stale UI if the component reads a store or `ctx.state` |
| **Automatic memo by runtime read recording** | built, measured, not adopted (section 2) | **+232 B** | matches hand memo with no app code changes; handles store-aware components | stale UI if a component reads something that is not a prop or store value |
| **Component-level re-render for `ctx.state`** | built, measured, not adopted (section 3) | **+110 B** | a local write stops re-rendering the whole app: 1 of 1,000 stateful rows 4.4 to 0.1 ms | other components are no longer refreshed by an unrelated local write |
| **Subscription tracking** (store write re-renders only its readers) | **never built as one thing** (section 4) | estimate +300 to 450 B | O(changed) instead of O(rows) per update | needs unsubscribe, ordering, and the read-tracking footgun |
| **Kyvo rewritten on signals** (no vdom) | built as a prototype and a full journal port, not adopted (section 4) | framework +20% | 2 to 3x less main-thread time on big stable grids | silent staleness without `() =>` thunks and more |
| **Selector memo** `memo(C, select)` | design only (section 5) | estimate +130 to 170 B | store-aware memo, you list the dependencies | a forgotten dependency means stale UI |
| **Build-time auto memo** (static analysis) | design only (section 5) | estimate +130 B runtime plus the compiler | none over runtime recording | can only prove the easy cases |

Rule of thumb from all of it: none of these matter until an app **renders thousands of elements at once** (about 1,000 plain rows on
a fast desktop, about 300 on a phone-speed CPU). Virtualize first (it caps a list at about 60 rows), then `memo` the rows. Everything
below is for the case where you still need more.

## 1. Hand-written memo (built, removed)

`memo(Component)` skips running the component and its subtree when its props are shallow-equal. It is a userland helper plus a
two-line skip check in `diffInternal`. [MEMO.md](MEMO.md) is the complete recipe, including the tests to add.

- **Load test** (full numbers in the load-test `REPORT.md`, section 6): 1.0x to 4.7x. It only pays for large lists of pure rows where
  most rows are unchanged per update, and it leaves an O(rows) floor (a cheap check per row).
- **Micro:** 1,000 pure rows with one changed: 17 ms plain, 1.5 ms memo; 3,000 rows: 50 ms to 4.5 ms.
- **Size:** about +90 to +110 B.
- **Hazard (pinned by a test in the recipe):** a memoized component must not read a store, hold `ctx.state`, or take `children`, or it goes stale.

## 2. Automatic memo by runtime read recording (built, measured, not adopted)

**Idea.** No `memo` calls and no dependency lists. The store records which keys each component reads while it renders (a version per
key, a `get` trap), and a component is skipped when its props are shallow-equal and every key it read still has the version it was
read at. It is still brute force: the root renders on every store write and each component decides locally. There are no
subscriptions and no dirty set.

**Two details that are easy to get wrong**
- A skipped component's descendants are skipped too, so a component's dependency list must include its **whole subtree's** reads. The
  diff collects each child's reads and passes them up to the enclosing component (`acc`, `done()` in the patch below). This also covers
  `ctx.state` (a store like any other), so a memoized parent can contain stateful children.
- A render that throws must never be skipped next time, so `i._d = 0` before a re-render and it is only set after success.

**Never skipped:** a component with `children` (new vnodes every render), or one that receives a function prop (an inline handler is a new
function each render; ignoring it would run a stale closure).

**Hazard.** A component that reads anything that is not a prop or a store value (a module variable, `Date.now()`, `location`, a `ctx`
field, the DOM) goes stale, because brute force used to hide that by re-running everything. Safety nets in the patch: a dev-only `verify()`
that renders a skipped component anyway and warns if the output differs (stripped from production), and a `Component.fresh = 1`
opt-out. (We did not separately confirm in the suite that the warning fired.)

### Results

**Size.** Core 1,707 to 1,939 B (+232 B, this measurement method, production build, dev verification stripped). Benchmark app bundle
(esbuild only): plain 2,343 B, hand memo 2,470 B, auto 2,575 B. An app that already ships the memo recipe nets about +130 B.

**Tests (against the committed core).**
- kyvo suite, prod and mangled: **130 of 134 pass.** The 4 failures all assert brute-force behavior: "re-runs every component on a
  render, even with identical props"; "ctx is one persistent object across renders" (it reads a non-store `ctx.counter` and expects a
  re-render on identical props: the hazard itself); "debounced: a trigger keeps the same identity across renders"; "a state write right
  after a failed render still renders" (the last two render twice with identical props and expect two calls).
- kyvo suite, dev: 144 of 145 (the dev verification re-runs the skipped component, which masks three of those four).
- Journalize, dev build: **388 of 388.** Prod build: **383 of 386**; the 3 failures are render-count assertions in
  `components/app/scheduling.spec.js`, which count calls of a pass-through probe component.
- Dashboard DOM identical to plain kyvo in all four iterations (`harness/parity.js`), and 30 of 30 sampled rows update under live data
  (`harness/liveness.js`).

**js-framework-benchmark** (krausest; 1,000 and 10,000 keyed rows; median total ms, includes paint; 10 iterations; headless). The app code is
the same for plain and auto; memo wraps `Row` by hand. Entries rebuilt on the committed core.

| | plain | hand memo | auto |
|---|---:|---:|---:|
| create 1,000 rows | 35.7 | 36.0 | 36.1 |
| replace 1,000 rows | 39.3 | 37.5 | 37.9 |
| update every 10th row | 44.1 | 21.9 | 27.1 |
| select row | 25.1 | 7.5 | 7.2 |
| swap rows | 107.4 | 95.8 | 94.9 |
| remove row | 60.0 | 48.9 | 47.5 |
| create 10,000 rows | 256.2 | 267.7 | 261.9 |
| append 1,000 rows | 37.8 | 34.4 | 37.3 |
| clear | 18.4 | 13.8 | 18.3 |
| **geometric mean** | **49.5** | **37.1** | **39.1** |

Auto costs nothing when nothing can be skipped (create, replace and create-10k are within 4% of plain). It trails hand memo on update
(+24%), clear (+32%) and append (+9%). Swap and remove are slow in every column: they are cursor-move cost, not render cost (see the
note on the longest-increasing-subsequence pass in `PREACT11-IDEAS.md`).

**Dashboard** (load-test iteration 4, live data; work per frame p50, then fps):

| | plain | hand memo | auto |
|---|---:|---:|---:|
| 1,000 plain rows, x1 | 19.2 ms | 13.7 ms | 13.4 ms |
| 12,000 tiles, x1 | 38.7 ms, 36 fps | 24.1 ms, 50 fps | 19.7 ms, 52 fps |
| 1,000 plain rows, x4 | 57.6 ms, 28 fps | 30.9 ms, 49 fps | 29.8 ms, 50 fps |
| 12,000 tiles, x4 | 168.8 ms, 7 fps | 100.7 ms, 11 fps | 82.9 ms, 13 fps |

**Verdict.** It met the bar we set before building (within about 10% of hand memo on the dashboard and most benchmark rows, no regression
when nothing is skippable, size under +320 B, every test failure explained). It was not adopted because the journal gains nothing (its
root render is about 0.5 ms) and the cost is the hazard above plus a new thing to learn. It is the most attractive of the options if an
app ever needs more.

### How to put it back

Start from the committed core (the version the patch below was made against is the one with `diffChildren` using a `Map`).

1. **Apply the patch** to `core.js` (full diff below). It adds: version-per-key and a `get` trap in `store()`, read recording in `run()`,
   subtree collection in `createDom()` and `diffInternal()`, the `skip()` check, `done()`, the dev-only `verify()`, and a reset of `acc` at
   the start of `render()`.
2. **Change the tests that assert brute force.** In `test/core.spec.js`, `test/helpers.spec.js` and `test/robustness.spec.js`, the four tests above
   must either mark their component `fresh = 1` or stop asserting re-run counts. In the journal, give the probe in
   `components/app/scheduling.spec.js` `fresh = 1` (or count DOM changes, not calls).
3. **Add tests:** skips when props and reads are unchanged; re-runs when a store key it read changes; a child that reads the store under a
   skipped parent still updates; a child's `ctx.state` under a skipped parent still updates; never skips with `children` or an inline function
   prop; `fresh = 1` opts out; a component whose render threw is re-rendered next time; (dev) a component that reads a module variable warns.
4. **Docs:** README "Mental model" item 3 ("A render re-runs everything") becomes "a component is skipped when its props and everything it
   read are unchanged"; add the rule about reading only props and stores, and `fresh`. Add `memo` to "Not included" as unnecessary.
5. **Re-measure** (all scripts are in the load-test folder, see "Where the raw data lives"): `node harness/parity.js`, `node harness/liveness.js`,
   `node harness/sweep.js V4` for the dashboard, and the `kyvo-auto` entry in `js-framework-benchmark/frameworks/keyed/`.

If it is ever combined with the component-level re-render in section 3: `rerender(i)` must go through the same `done(i, outer)` bookkeeping
and set `i._d = 0` before it runs. That combination was not tried.

<details><summary>Full patch (against core.js at commit 014e3fa)</summary>

```diff
--- core.head.js	2026-11-23 18:47:30
+++ core.auto.js	2026-11-23 18:47:53
@@ -11,6 +11,8 @@
 
 // ---------------------------------------------------------------- scheduling
 let root, rendering, scheduled, wrote, chain = 0, mountQueue = [], refQueue = [];
+let cur, acc = [];          // cur: reads recorded by the component function that is running; acc: reads of the subtree being diffed
+const NONE = [];
 
 function schedule() {
   if (!scheduled) { scheduled = 1; requestAnimationFrame(flush); }
@@ -36,13 +38,19 @@
 // Shallow, set-trap-only proxy. `notify(key)` is called after every changed write.
 export function store(obj, notify) {
   let fns;
+  const ver = {};
   return new Proxy(obj, {
+    get(t, k) {
+      if (cur && typeof k == 'string') cur.push(ver, k, ver[k] | 0);
+      return t[k];
+    },
     set(t, k, v) {
       if (k === W) { (fns || (fns = [])).push(v); return true; }
       const prev = t[k];
       if (Object.is(prev, v)) return true;
       if (typeof __DEV__ === 'undefined' || __DEV__) freeze(v);
       t[k] = v;
+      ver[k] = (ver[k] | 0) + 1;
       if (notify) notify(k);
       else {
         if ((typeof __DEV__ === 'undefined' || __DEV__) && rendering) wrote = { k };
@@ -136,7 +144,10 @@
     const i = Object.create(proto);
     i._vnode = vnode;
     i._props = {};
+    const outer = acc;
+    acc = [];
     i._c = createDom(run(i), svg);
+    done(i, outer);
     return i;
   }
   const s = svg || vnode.type == 'svg';
@@ -163,8 +174,11 @@
   Object.assign(p, next);
   if (typeof __DEV__ === 'undefined' || __DEV__) { i._n = 0; i._u = 0; }
   let out;
+  const own = [], outer = cur;
+  cur = own;
   i._r = 1;
-  try { out = i._vnode.type(p, i); } finally { i._r = 0; }
+  try { out = i._vnode.type(p, i); } finally { i._r = 0; cur = outer; }
+  i._o = own;
   if (!i._ok) { i._ok = 1; i._n0 = i._n; }
   return out || out === 0 ? out : '';
 }
@@ -187,6 +201,40 @@
   return before;
 }
 
+// Same props (children must be empty) and every store key this subtree read still has the version it was read at.
+function skip(i, old, vnode) {
+  const a = old.props, b = vnode.props, d = i._d;
+  if (!d || vnode.type.fresh || a.children.length || b.children.length) return;
+  for (const k in a) if (k != 'children' && a[k] !== b[k]) return;
+  for (const k in b) if (!(k in a)) return;
+  for (let j = 0; j < d.length; j += 3) if ((d[j][d[j + 1]] | 0) !== d[j + 2]) return;
+  return 1;
+}
+// Dev only: render the skipped component anyway and warn if its output would differ, i.e. it reads something that is neither a prop
+// nor a store value (a module variable, Date.now(), a ctx field, the DOM). Functions compare by source text.
+const deq = (a, b) => {
+  if (a === b) return true;
+  if (typeof a == 'function' && typeof b == 'function') return String(a) == String(b);
+  if (!a || !b || typeof a != 'object' || typeof b != 'object') return false;
+  const ka = Object.keys(a), kb = Object.keys(b);
+  return ka.length == kb.length && ka.every(k => deq(a[k], b[k]));
+};
+function verify(i, vnode) {
+  const before = i._c._vnode, outer = acc, d = i._d;
+  const out = run(i);
+  acc = outer;
+  i._d = d;                                  // keep the dependency list of the skipped render
+  if (!deq(out, before)) {
+    (window.__autoMemoWarnings || (window.__autoMemoWarnings = [])).push(vnode.type.name || 'anonymous');
+    console.warn(`kyvo: ${vnode.type.name || 'a component'} was skipped but would render differently; it reads something that is not a prop or store value. Mark it with ${vnode.type.name || 'Component'}.fresh = 1.`);
+  }
+}
+// i's dependencies are its own reads plus everything below it; pass them up to the enclosing component
+function done(i, outer) {
+  i._d = i._o.length || acc.length ? i._o.concat(acc) : NONE;
+  acc = outer.concat(i._d);
+}
+
 function diffInternal(i, vnode, parent, before, svg) {
   const old = i && i._vnode;
   if (typeof vnode != 'object') {
@@ -200,8 +248,16 @@
   } else if (old && old.type === vnode.type) {
     i._vnode = vnode;
     if (typeof vnode.type == 'function') {
-      const dom = rootDom(i);
+      if (skip(i, old, vnode)) {
+        if (typeof __DEV__ === 'undefined' || __DEV__) verify(i, vnode);
+        acc = acc.concat(i._d);
+        return i;
+      }
+      const outer = acc, dom = rootDom(i);
+      i._d = 0;                      // a render that throws must never be skipped next time
+      acc = [];
       i._c = diffInternal(i._c, run(i), dom.parentNode, dom.nextSibling, svg);
+      done(i, outer);
     } else {
       const s = svg || vnode.type == 'svg', o = old.props.ref, n = vnode.props.ref;
       if (o !== n) { if (o) o(null); if (n) refQueue.push(() => n(i._dom)); }
@@ -257,6 +313,7 @@
 }
 
 export function render(vnode, el) {
+  acc = [];
   if (typeof __DEV__ === 'undefined' || __DEV__) rendering = 1;
   try { el._t = diffInternal(el._t, vnode || '', el); }
   catch (e) { mountQueue = []; refQueue = []; throw e; }
```

</details>

## 3. Component-level re-render for `ctx.state` (built, measured, not adopted)

**Idea.** A `ctx.state` write marks only its component dirty and re-renders just that component (with the props of its last render). A
`store` write still re-renders the whole app. It would also lift the rule that a memoized component cannot hold state.

**Implementation** (about 40 changed lines): a `dirty` set; `ctx.state`'s `notify` becomes `() => this._r || (dirty.add(this), schedule())`;
a store write sets an `all` flag; `flush` renders the whole app if `all`, then re-renders each still-dirty, still-mounted component
(`rerender(i)`, which reuses a new `commit()` shared with `render()`); `run()` clears the instance from `dirty`; `unmount()` sets `_dead`;
createDom records `_svg` so a re-rendered component knows whether it is inside an `<svg>`. One failing component must not stop the others
(`guard`). **Gotcha we hit:** the SVG flag was first named `_s`, which `ctx.state` already uses for its slots; the new tests caught it.

**Size.** Core 1,580 to 1,690 B (+110 B); journal page 9,905 to 10,021 B (+116 B, back over 10 KB). 11 new tests (156 dev, 145 prod and mangled).

**Micro-benchmark** (a clock with local state next to N plain rows of five elements each; median flush ms, 3 runs):

| Scenario | before | after |
|---|---:|---:|
| local write, N = 60 / 1,000 / 5,000, x1 | 0.8 / 3.7 / 10.9 | about 0.1 / 0.1 / 0 |
| local write, N = 60 / 1,000 / 5,000, x4 | 0.4 / 8.2 / 38.9 | about 0 |
| 1 of 1,000 stateful rows updates, x1 / x4 | 4.4 / 6.4 | 0.1 / 0 |
| all 1,000 rows update in one frame, x1 / x4 | 4.2 / 12.5 | 3.9 / 12.3 |
| **control:** the same tick as a global store write, N = 60 / 1,000 / 5,000, x1 | 0.8 / 4.4 / 10.5 | 1.0 / 5.2 / 11.1 |

The global-write control got slightly slower (about +0.6 to +0.8 ms at 1,000 to 5,000 rows, x1; none at x4 for 1,000 rows). We ruled out
the `dirty.delete` call and the shared `commit()` wrapper as the cause and did not find it.

**Dashboard** (iteration 4, scroll 24 px/frame; the grid keeps its scroll offset in `ctx.state`; work per frame p50):

| | before | after |
|---|---:|---:|
| scroll, x1 | 4.3 ms, busy 38% | 1.5 ms, busy 26% |
| 1,000 plain rows, scroll, x1 | 9.7 ms, busy 63% | 1.5 ms, busy 30% |
| scroll, x4 | 26.5 ms, 84% dropped frames | 11.1 ms, 57% dropped |
| 1,000 plain rows, scroll, x4 | 45.2 ms, 15 fps | 8.1 ms, 25 fps |
| control, no scroll, x1 / x4 | 19.3 / 55.8 ms | 20.0 / 56.6 ms |

The slowest frames (p95) do not change: those are the frames where live data lands, which are global writes and still render everything.
Savings per second = local writes per second times the cost of the rest of the tree, so it matters at about 1,000 un-memoized rows (x4) or
3,000 to 5,000 rows (x1), and only when the local value changes every frame (scroll, drag). Journalize saves about 0.7 ms per scroll write.

**Verdict.** Works, DOM identical to the control in all four iterations. Not adopted: it only helps apps that already render thousands of
elements, which virtualization and memo cover, and it costs +110 B and a second update path. The patch and tests are archived
(`local-rerender/local-rerender.patch`, `local-rerender/local.spec.js` in the load-test folder).

## 4. Subscription tracking, and the signals rewrite

**Subscription tracking was never built as one thing.** The design: record reads (a `get` trap), keep a set of subscribers per store key,
and on a store write re-render only the components that read that key (a dirty set plus `rerender(i)`), with the section-2 skip check on
cascades. Its two halves were each built and measured in sections 2 and 3, but never combined. Estimated +300 to 450 B on the committed
core. It would make an update O(changed components) instead of O(rows). Costs: unsubscribe on unmount, render order (parents before
children), and the same read-tracking hazard as section 2.

**The closest thing we built is the signals rewrite** (`kyvo-signals/`, no vdom, signals as the only reactivity; the journal was ported on
a branch and archived in `journal-kyvo-signals/`). Outcome: framework 2,078 B vs 1,729 B (+20%); the tasks example app +9.6%; the journal
page +3.4% (10,371 B vs 10,028 B at the time); 2 to 3x less main-thread time than kyvo on large stable grids; about a tie with Preact +
signals. Footguns: silent staleness without `() =>` thunks, frozen props, rows receive a signal, ambient ownership, SVG tag sniffing. We
leaned no and stayed on vdom kyvo.

## 5. Designed, not built

- **Selector memo**, `memo(C, select)` where `select(props)` returns the store-derived values to compare, in the style of zustand's
  selectors: `memo(Row, ({ row }) => [app.selected === row.id])`. Brute force, no proxy tracking, store-aware. Estimated +130 to 170 B
  (the old memo plus a selector parameter). The footgun is a store read missing from the selector; a dev-only "render anyway and compare"
  check (as in section 2's `verify`) would catch it.
- **Build-time auto memo**: a Babel pass that finds `app.x` reads and emits the selector for you, applying memo only to components used
  as keyed list items. It must be conservative (any unknown call, function prop called during render, `children`, or `app` passed as
  an argument means no memo), so it covers the easy leaf rows you could memoize by hand. It gives key-level granularity only, not derived
  booleans. An **advisory** version (a report of "these components are safe and worth memoizing") has no soundness risk and no runtime cost.
  Section 2 does the same job at runtime with fewer limits.

## Where the raw data lives

All of it is in the untracked sibling folder `kyvo-load-test/` (not in git): `auto-memo/` (the patch, the scratch cores, `V4.log`),
`local-rerender/` (`PLAN.md`, the benchmark, results, patch), `js-framework-benchmark/` (clone of krausest's benchmark with `kyvo`,
`kyvo-memo` and `kyvo-auto` entries, `KYVO-RESULTS.md`), `kyvo-signals/`, `journal-kyvo-signals/`, `REPORT.md` and `FINDINGS.md` (the load
test), `results/V3.log` and `results/V4.log` (dashboard A/Bs), and `README.md` (an index of all of it).
