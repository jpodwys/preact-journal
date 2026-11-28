# Ideas from Preact 11's diff for kyvo's vdom

Status: **ideas 1, 2, 4a, 5 and 7 are applied to `core.js`. Idea 3 (lazy matching) was applied, measured, and then removed** (see its section) (24 new tests in `test/renderer.spec.js`; 145 tests pass in dev, 134 in the
prod and mangled builds, where 11 dev-only tests are skipped by design). **Not applied:** idea 4b (longest increasing subsequence,
+149 B, only for reorder-heavy lists) and idea 6 (rejected). Resulting size after the lazy matching was removed: `core.js` 1,580 B brotli (core + helpers 1,713 B) by `node test/size.js`. Every number below was measured on a copy of
kyvo's real `core.js`, one change at a time, with kyvo's own 121-test suite (as it was then) run against every variant. All 121
passed for every variant.

Method and caveats:
- Preact version read: 11.2.0 (`src/diff/children.js`, `src/diff/props.js`, and `diffElementNodes` in `src/diff/index.js`). I did
  **not** read the rest of `diff/index.js` (components, hooks, suspense, hydration), `catch-error.js` or `create-element.js` in depth;
  none of it applies to kyvo's design.
- Sizes are brotli q11 of the minified `core.js` (`__DEV__` false, `_`-props mangled): **1,503 B** today.
- Speed is JS time for a synchronous `render()` in headless Chrome 157 on an M4 Mac mini, median of 15 (or of 9 fresh pages for the
  reorder cases). **It excludes layout and paint**, so DOM-move counts are the better indicator for reorders. Differences under about
  0.4 ms between runs are noise.
- kyvo's suite has **no test** for any behavior changed below, which is why it stayed green. Each idea lists the tests to add.
- Experiment code (variants, benchmark, probes) lives outside the repo in `kyvo-load-test/kyvo-gems/`; `node make-variants.js && node run.js`
  regenerates every number here.

## Summary

| # | Idea | Cost (brotli) | What it buys | Verdict |
|---|---|---:|---|---|
| 1 | Handlers in a per-element table behind one stable listener | **+1 B** | 2,000 `addEventListener` + 2,000 `removeEventListener` per idle render of 1,000 rows → **0 / 0** | adopt |
| 3 | No `Map` per element per render (positional match first, map built lazily) | +102 B | 12,000-component idle render **13.4 → about 8 ms (−35 to −40%)**; also removes a redundant `insertBefore` for every newly created node | ~~adopt~~ **removed later** (see section 3) |
| 4a | `moveBefore` for repositioning (feature-detected) | about 0 B | a focused input in a moved row **keeps focus** (false → true); also preserves CSS animations, selection, iframes | adopt |
| 5 | Apply `value` / `checked` after the children | +38 B | `<select value="b">` shows **b** (was a); `<input type=range value=150 max=200>` shows **150** (was 100) | adopt (correctness) |
| 7 | `list` and `form` go through `setAttribute` | +8 B | `<input list="dl">` actually sets `list` (was silently dropped) | adopt (correctness) |
| 2 | Per-key `style` diff, and CSS custom properties | +67 B | `style={{'--x':'3px'}}` works (was ignored); fewer style writes when a style object is re-created with equal values | adopt if inline style objects are common |
| 4b | Longest-increasing-subsequence minimum moves | **+149 B** on top of the above | first→last **999 → 1** moves, remove-middle **499 → 0**, swap-two **890 → 2**; random shuffle only 996 → 940 | optional; only for reorder-heavy lists |
| 6 | `h()` writes `children` onto the caller's props instead of copying | −3 B | **no measurable speed difference**; mutates the caller's object | reject |

Combined, ideas 1, 2, 3, 4a, 5, 7: **1,711 B (+208 B, +13.8%)**; idle render of 1,000 rows 2.9 → 2.0 ms, 12,000 small components
13.4 → 8.7 ms. Adding 4b: **1,860 B (+357 B, +23.8%)**.

## What the base kyvo does today (measured, not assumed)

Rendering 1,000 keyed rows:

| change | DOM moves (insertBefore of an attached node) |
|---|---:|
| move last row to the front | 1 |
| insert a row at the front | 1 (a redundant re-insert of the new node) |
| **move first row to the end** | **999** |
| **remove one row from the middle** | **499** |
| **swap two rows** | **890** |
| reverse | 999 (inherent) |
| random shuffle | 996 |

Why: `diffChildren` places each child at `prev.nextSibling`. Nodes that are about to be removed are still in the DOM while the loop runs, so
every later sibling looks out of place and is moved. And a child that `diffInternal` just inserted is inserted a second time. Likely
effect on the journal (inferred from the windowed list, **not measured in the app**): deleting an entry would move roughly half the
rendered rows for no reason. A moved row losing focus is measured (see idea 4a); that `insertBefore` also restarts CSS
animations is known browser behavior that I did not test.

## The ideas, in detail

### 1. Event handlers behind one stable listener (adopt)
Preact stores `dom._listeners[name] = handler` and adds one shared proxy listener per event name, once. kyvo removes and re-adds the
listener whenever the function identity changes, which is every render for an inline arrow function (`onclick={() => ...}`).

Measured on 1,000 rows with two handlers each: **2,000 adds + 2,000 removes per render → 0 + 0**; render time 3.2 → 2.8 ms.
Risks: the proxy stays attached after a handler is set to `null` (it becomes a no-op); `this` inside the handler is no longer the
element (use `e.currentTarget`; arrow functions never used it). Tests to add: a handler swapped across renders is called once with the
latest function; a handler set to `null` stops being called; no add/remove calls when only the function identity changes.

### 3. Lazy matching instead of a `Map` per element (adopted, then removed)

**Update:** removed again after the js-framework-benchmark run. It bought a 10-15% gain on large *plain* (unmemoized) lists and nothing with `memo`, at 4x
CPU slowdown, or with a virtualized list (about 60 rows), for +102 B. It also did not help the benchmark's swap and remove cases, whose cost is the
cursor moving every row after the change. The cursor recomputation (`at`, read after the child is diffed) and `moveBefore` stay. Back to a `Map`
per element, plus a dev-only duplicate-key check. The rest of this section is the history.
kyvo builds `new Map(i._kids.map(...))` for **every element's children on every render**, including elements whose children never
reorder. Preact 11 instead looks for the old child at the expected position first and only searches on a mismatch (it adds a "skew"
so a single insertion or removal does not make everything mismatch).

My version is smaller than Preact's: match by position; on the first mismatch build the key map and a `Set` of the positions already
consumed; if the list is only being appended to, never build a map. **12,000 two-child components: 13.4 → about 8 ms.**

Two things I got wrong first, both caught by tests, so keep the final form:
1. Marking old nodes as "matched" (`o._m = 1`) is wrong: if a render throws midway the marks stay set and corrupt the next render
   (kyvo's own test "a render that throws on update leaves the framework usable" failed). Track matches in a local `Set`.
2. Do not build the map when a list only grows (`was[j]` is undefined with no map yet).

Also recompute the cursor *after* diffing a child (`at`, not `before`), which removes the redundant re-insert of new nodes. Tests to
add: reorder, insert, remove, append, duplicate keys, a throwing child mid-list followed by a good render, keyed and unkeyed mixed.

### 4a. `moveBefore` (adopt, about free)
Chrome 133+ `Element.moveBefore(node, ref)` moves a node without removing it, so focus, selection, iframes, video and CSS
animations/transitions survive. Preact 11 uses it when present. Measured: focus in a moved row **false → true**. Feature-detected
(`dom.moveBefore ? dom.moveBefore(d, at) : dom.insertBefore(d, at)`), so it falls back to today's behavior wherever it is missing. I
only tested Chrome 157 and did **not** verify Safari or Firefox support, so assume no benefit on those until checked. Test: a focused input survives a reorder (skip when
`moveBefore` is missing).

### 5. `value` and `checked` after children (adopt, correctness)
kyvo sets all attributes in prop order and then creates children. `<select value="b">` therefore assigns `value` before its `<option>`s
exist and the browser ignores it (shows **a**). `<input type="range" value="150" max="200">` assigns `value` before `max` and clamps it
to 100. Preact applies `value` and `checked` last. Fixed in both `createDom` and the update path. Tests: a select with an initial value,
a range input with `value` listed before `max`.

### 7. `list` and `form` (adopt, correctness)
`input.list` and `button.form` are read-only DOM properties, so the "property when the element has one" rule silently drops
`<input list="x">`. Preact keeps an exclusion list (`width`, `height`, `href`, `list`, `form`, `tabIndex`, `download`, `rowSpan`,
`colSpan`, `role`, `popover`); only `list` and `form` actually fail in kyvo (a probe showed `tabIndex` removal already works). Two
names for 8 B. Test: `<input list="dl">` has the attribute.

### 2. Per-key `style` diff (adopt if inline style objects are common)
kyvo resets `cssText` and re-applies every key whenever the style prop changes identity, i.e. every render with `style={{...}}`.
Preact diffs per key. This also adds support for CSS custom properties (`'--x'` goes through `setProperty`; kyvo's `style[k] = v`
ignores them silently: **'' → '3px'**). Measured speed difference was within noise in my benchmark, so the case rests on the custom
properties and on avoiding style invalidation, which I did **not** measure (no layout in the benchmark). The existing tests for
string/object/none transitions all pass.

### 4b. Longest increasing subsequence (optional, +149 B)
The minimum number of moves: children on a longest increasing subsequence of old indices never move. It fixes exactly the patterns
above (first→last 999 → 1, remove-middle 499 → 0, swap 890 → 2) and does nothing for a random shuffle (996 → 940, since a random
permutation's LIS is only about 2√n) or a reverse. Worth it only for lists that reorder by a few items at a time, such as a live-sorted
board where a couple of rows change rank per tick. The journal's list reorders rarely, so I would skip it there. A cheaper way to fix
just remove-middle (remove unmatched old children before placing) was not tried.
One bug in my first version: the old-index marker (`_i`) must also be set when a list is first mounted in `createDom`, or the first
reorder after mount sees no indices and falls back to the greedy path.

### 6. `h()` without the props copy (reject)
`props.children = ...` instead of `{ ...props, children }` saved 3 B and made no measurable difference to render time, and it mutates
an object the caller owns (a shared or frozen props object breaks). Not worth it.

## Not adopting

- **Event clock** (`EVENT_DISPATCHED`, Preact #3927): guards against a handler firing on a node created while the same event is still
  bubbling. kyvo renders on `requestAnimationFrame`, never inside an event dispatch (the public `render()` is synchronous, so a handler
  that calls it directly could hit this; nothing in the app or examples does).
- **Array/Fragment/text normalization at diff time:** kyvo flattens in `h()`; there are no fragments.
- **Hydration, `excessDomChildren`, Suspense, context, hooks, class components, error boundaries, portals, `dangerouslySetInnerHTML`,
  `<template>`, MathML, `options` hooks, vnode `_flags`:** outside kyvo's scope or already covered by its design.
- **Identical-vnode bail-out** (`newVNode._original === oldVNode._original`): kyvo's memo recipe already does this.
- **Preact's full skew search:** idea 3 gets the common-case win with less code. The skew search also avoids building the map for a
  single insertion/removal in the middle; I did not measure whether that matters.

## Suggested order

1. Ideas 1 and 7 (+9 B total). Idea 5 (+38 B). All three are small and two are correctness fixes.
2. Idea 3 (+102 B) with the tests above. This is the one with a real speed result.
3. Idea 4a (about free).
4. Idea 2 (+67 B) if inline style objects or CSS variables matter.
5. Idea 4b only if a reorder-heavy list shows up.

## Result on the dashboard load test (after applying)

Same dashboard, same machine, same session: every run of the new core sits next to a run of the old core (22 pairs: four heavy configs,
plain and memo, at 1x and 4x CPU slowdown, plus live sort and scrolling). Single 6-second runs, so differences under about 5% are
noise; the old-core control agrees with the earlier result files within about 2%. Ratios are new / old.

| | busy % of main thread | render work p50 |
|---|---:|---:|
| median over all 22 pairs | **0.96** | **0.93** |
| plain kyvo, desktop speed (1000 rows, 12,000 tiles, HEAVY terminal, iter4 default) | 0.85 to 0.91 | 0.86 to 0.93 |
| kyvo + memo, desktop speed | 0.93 to 1.04 | 0.95 to 1.04 |
| plain kyvo, 4x slowdown | 0.82 to 1.01 | 0.88 to 0.99 |
| live sort (reorders every update) | 0.88 to 1.04 | 0.85 to 1.06 |
| scrolling | 0.91 (x1), 0.98 (x4) | 0.86, 0.85 |

Examples: 12,000 tiles plain, 41.1 → 35.5 ms per render and 36 → 41 fps; 1,000 rows plain at 4x, 57.5 → 51.9 ms and 28 → 36 fps.

Reading it honestly:
- The gain is real but **small: about 10 to 15% on plain kyvo at desktop speed, within noise with memo or at 4x slowdown.** The micro-benchmark
  predicted about 35% for the idle render of 12,000 components; at full load that diff is only part of each render, and DOM writes
  and layout (unchanged by this work) dominate, which is the same finding as the rest of the load test.
- **No help on live-sorted grids**, as expected: LIS (idea 4b) is not applied, and a live sort reorders most rows anyway.
- Cost: the dashboard bundles are 224 to 232 B (about 4%) bigger; the journal's shipped page went 9,954 → 10,134 B (+1.8%).
- The justification for adopting these is therefore mostly **correctness** (select value, range, CSS variables, `list`/`form`, focus on
  move) plus a modest speed gain, not speed alone.

## The patches

Both are against `client/packages/kyvo/core.js` as of branch `kyvo` (68ecbd6). They were generated by `kyvo-gems/make-variants.js`.

### Ideas 1, 2, 3, 4a, 5, 7 (1,711 B)

```diff
@@ -92,30 +92,33 @@
 };
 
 // ---------------------------------------------------------------- renderer
+const setStyle = (st, k, v) => (k[0] == '-' ? st.setProperty(k, v == null ? '' : v) : (st[k] = v == null ? '' : v));
 function setAttr(dom, name, value, old, svg) {
   if (name == 'style') {
     // Reset, then apply: handles string, object, and removed styles uniformly
     // (all in one task, so there is no intermediate style recalculation).
-    const str = typeof value == 'string';
-    dom.style.cssText = str ? value : '';
-    if (!str) for (const k in value) dom.style[k] = value[k];
+    const str = typeof value == 'string', fresh = str || !value || !old || typeof old == 'string';
+    if (fresh) dom.style.cssText = str ? value : '';
+    else for (const k in old) if (!(k in value)) setStyle(dom.style, k, '');
+    if (!str && value) for (const k in value) if (fresh || value[k] !== old[k]) setStyle(dom.style, k, value[k]);
   } else if (name[0] == 'o' && name[1] == 'n') {
     const e = name.slice(2).toLowerCase();
     const l = dom._l || (dom._l = {});
-    if (old) dom.removeEventListener(e, l[e]);
-    if (value) dom.addEventListener(e, l[e] = value);
+    if (!(e in l)) dom.addEventListener(e, ev => l[e] && l[e](ev));
+    l[e] = value;
   } else if (name != 'children' && name != 'key' && name != 'ref') {
     // Property when the element has one (value, checked, disabled, href, ...), else attribute.
     const gone = value == null || value === false;
-    if (!svg && name in dom) dom[name] = gone ? '' : value;
+    if (!svg && name in dom && name != 'list' && name != 'form') dom[name] = gone ? '' : value;
     else if (!gone) dom.setAttribute(name, value === true ? '' : value);
     if (gone) dom.removeAttribute(name);
   }
 }
 
-function diffAttrs(dom, next, prev, svg) {
-  for (const k in prev) if (!(k in next)) setAttr(dom, k, null, prev[k], svg);
-  for (const k in next) if (next[k] !== prev[k]) setAttr(dom, k, next[k], prev[k], svg);
+const late = k => +(k == 'value' || k == 'checked');
+function diffAttrs(dom, next, prev, svg, pass = 0) {
+  for (const k in prev) if (!(k in next) && late(k) == pass) setAttr(dom, k, null, prev[k], svg);
+  for (const k in next) if (next[k] !== prev[k] && late(k) == pass) setAttr(dom, k, next[k], prev[k], svg);
 }
 
 const rootDom = i => i._c ? rootDom(i._c) : i._dom;
@@ -144,6 +147,7 @@
     i._kids.push(k);
     dom.appendChild(rootDom(k));
   });
+  diffAttrs(dom, vnode.props, {}, s, 1);
   return i;
 }
 
@@ -199,6 +203,7 @@
       if (o !== n) { if (o) o(null); if (n) refQueue.push(() => n(i._dom)); }
       diffAttrs(i._dom, vnode.props, old.props, s);
       diffChildren(i, vnode.props.children, s);
+      diffAttrs(i._dom, vnode.props, old.props, s, 1);
     }
     return i;
   }
@@ -209,20 +214,23 @@
 }
 
 function diffChildren(i, kids, svg) {
-  const dom = i._dom, old = new Map(i._kids.map(o => [o._k, o])), next = [];
-  let prev;
+  const dom = i._dom, was = i._kids, next = [];
+  let prev, map, used;
   kids.forEach((v, j) => {
     const k = keyOf(v, j), before = prev ? prev.nextSibling : dom.firstChild;
-    const r = diffInternal(old.get(k), v, dom, before, svg), d = rootDom(r);
-    old.delete(k);
+    let o = was[j];
+    if (!(o && o._k === k && !(used && used.has(o)))) {   // not a positional hit: look the key up (map built on first need)
+      if (map || o) { map || (map = new Map(was.map(x => [x._k, x])), used = new Set(was.slice(0, j))); o = map.get(k); if (used.has(o)) o = 0; }
+      else o = 0;                                          // appending past the old end with no reorder: nothing to match
+    }
+    if (used && o) used.add(o);
+    const r = diffInternal(o, v, dom, before, svg), d = rootDom(r), at = prev ? prev.nextSibling : dom.firstChild;
     r._k = k;
-    // Only reposition nodes still attached here: `d` may have been replaced by the
-    // user (contenteditable) and `before` by the child's own re-render.
-    if (d !== before && d.parentNode === dom && (!before || before.parentNode === dom)) dom.insertBefore(d, before);
+    if (d !== at && d.parentNode === dom && (!at || at.parentNode === dom)) dom.moveBefore ? dom.moveBefore(d, at) : dom.insertBefore(d, at);
     next.push(r);
     prev = d;
   });
-  for (const o of old.values()) remove(o, dom);
+  was.forEach((o, q) => (used ? !used.has(o) : q >= kids.length) && remove(o, dom));
   i._kids = next;
 }
 
```

### Add idea 4b on top (1,860 B)

```diff
@@ -144,6 +144,7 @@
   vnode.props.children.forEach((c, j) => {
     const k = createDom(c, s);
     k._k = keyOf(c, j);
+    k._i = j;
     i._kids.push(k);
     dom.appendChild(rootDom(k));
   });
@@ -213,20 +214,34 @@
   return fresh;
 }
 
+// stay[j] = 1 when child j is on a longest increasing subsequence of old indices (entries < 0 are new children, skipped).
+function lis(a) {
+  const t = [], p = [], out = [];
+  a.forEach((x, j) => {
+    if (x < 0) return;
+    let lo = 0, hi = t.length;
+    while (lo < hi) { const m = (lo + hi) >> 1; a[t[m]] < x ? (lo = m + 1) : (hi = m); }
+    p[j] = lo ? t[lo - 1] : -1; t[lo] = j;
+  });
+  for (let j = t.length ? t[t.length - 1] : -1; j >= 0; j = p[j]) out[j] = 1;
+  return out;
+}
+
 function diffChildren(i, kids, svg) {
   const dom = i._dom, was = i._kids, next = [];
-  let prev, map, used;
+  let prev, map, used, stay;
   kids.forEach((v, j) => {
     const k = keyOf(v, j), before = prev ? prev.nextSibling : dom.firstChild;
     let o = was[j];
     if (!(o && o._k === k && !(used && used.has(o)))) {   // not a positional hit: look the key up (map built on first need)
-      if (map || o) { map || (map = new Map(was.map(x => [x._k, x])), used = new Set(was.slice(0, j))); o = map.get(k); if (used.has(o)) o = 0; }
+      if (map || o) { map || (map = new Map(was.map(x => [x._k, x])), used = new Set(was.slice(0, j)), stay = lis(kids.map((u, q) => { const m = map.get(keyOf(u, q)); return m ? m._i : -1; }))); o = map.get(k); if (used.has(o)) o = 0; }
       else o = 0;                                          // appending past the old end with no reorder: nothing to match
     }
     if (used && o) used.add(o);
     const r = diffInternal(o, v, dom, before, svg), d = rootDom(r), at = prev ? prev.nextSibling : dom.firstChild;
     r._k = k;
-    if (d !== at && d.parentNode === dom && (!at || at.parentNode === dom)) dom.moveBefore ? dom.moveBefore(d, at) : dom.insertBefore(d, at);
+    if (d !== at && !(stay && stay[j]) && d.parentNode === dom && (!at || at.parentNode === dom)) dom.moveBefore ? dom.moveBefore(d, at) : dom.insertBefore(d, at);
+    r._i = next.length;
     next.push(r);
     prev = d;
   });
```
