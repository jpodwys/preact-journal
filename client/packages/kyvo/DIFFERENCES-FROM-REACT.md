# Coming from React

kyvo looks like React and mostly reads like it. This page lists what behaves differently, so you can learn it once.

## State

**Assign to it.** There is no setter and no hook order.

```jsx
const Counter = (props, ctx) => {
  const s = ctx.state({ count: 0 });
  return <button onclick={() => s.count++}>{s.count}</button>;
};
```

- A write is readable at once: after `s.count++`, `s.count` is the new value. The screen follows on the next animation frame.
- As in React, **replace** arrays and objects: `s.items = [...s.items, item]`. `push` is not noticed.
- Slots are found by name, not call order, so `ctx.state` may be conditional. A second one needs a key.
- Shared state is a `store()` that any component imports. There is no context or provider.
- Any write re-renders the whole app. There is no `memo`, `useMemo` or `useCallback`.

## Props and callbacks

`props` is **one object that is updated in place**. A long-lived callback sees current values through `props.x`, but a
destructured name stays as it was.

```jsx
const Ticker = (props, ctx) => {
  ctx.mount(() => {
    const t = setInterval(() => props.onTick(props.step), 1000);   // not a destructured `step`
    return () => clearInterval(t);
  });
};
```

A value computed during render can be a keystroke behind by the time a handler runs. Compute it in the handler.

## Effects

| React | kyvo |
|---|---|
| `useEffect(fn, [])` | `ctx.mount(fn)` |
| `useEffect(fn, [a, b])` | `effect(ctx, fn, [a, b])` |
| remount with `key` | the same |

- The list says only **when to restart**. `props.x` and store reads are current without being listed.
- `effect` reruns just after the render, so state it resets can show its old value for one frame. To start over for a
  new id, use `key`.
- A second `effect` or `debounced` in one component needs its own key. `listen` and `debounced` are built in.

## Refs

`ref={el => ...}` runs when the element is created and, with `null`, when it is removed. An inline function does **not**
run again on later renders. There are no ref objects: keep what you need on `ctx` (`ctx.input = el`), which never
re-renders. On a component, `ref` is an ordinary prop.

## Elements and events

- Events are the browser's own. `oninput` fires on every keystroke; `onchange` fires when a field is committed. Names
  are lowercased, so `onClick` works, but use the browser's names: `ondblclick`, not `onDoubleClick`.
- Inputs are not forced back to their `value`. kyvo compares with what it last rendered, so text your handler rejects
  stays on screen.
- Write `class` and `for`.
- Style values need units: `top: '40px'`, not `top: 40`.
- `innerHTML` is ignored, and there is no `dangerouslySetInnerHTML`. Set trusted HTML through a `ref`.

## Children

- A component returns **one** element. There are no fragments or array returns.
- `{false}`, `{null}` and `{undefined}` arrive in `props.children` as `''`, which holds the position. When reading
  children, skip them in place: `props.children.map(c => c && <li>{c}</li>)`.

## Not there

Suspense, error boundaries, portals, server rendering, developer tools. `lazy()` covers code splitting.

## Fewer warnings

Development builds throw for in-place mutation of an assigned store value, duplicate keys, a second `ctx.state`, `effect`
or `debounced` under one name, a late `ctx.mount`, `watch` during a render and a render loop. Other mistakes are silent,
and there is no lint rule.
