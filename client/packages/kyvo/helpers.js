// Userland helpers: plain functions that take ctx. Tree-shaken when unused.

// Adds `fn` as a listener on mount, removes it on unmount. `fn` is the first
// render's closure, so it must read `props.x`, not destructured names. `opts`
// is passed to both add and remove (e.g. { passive: true, capture: true }).
export const listen = (ctx, target, event, fn, opts) =>
  ctx.mount(() => {
    target.addEventListener(event, fn, opts);
    return () => target.removeEventListener(event, fn, opts);
  });

const K = Symbol();

// Returns a stable trigger that debounces calls to the LATEST fn, passing it the
// most recent call's arguments. State lives on ctx (non-reactive). Each `key` (a second
// use in one component needs one; a changing key such as an id works too) has its own
// timer and pending call. A pending call is never lost: if the component unmounts it
// runs once, immediately, so an edit made just before leaving still gets saved.
const run = s => { const a = s.a; s.a = 0; if (a) s.f(...a); };

export function debounced(ctx, fn, ms, key = '') {
  const m = ctx[K] ||= {};
  const s = m[key] || (m[key] = { g: (...a) => { s.a = a; clearTimeout(s.t); s.t = setTimeout(() => run(s), ms); } });
  s.f = fn;
  ctx.mount(() => () => { for (const k in m) { clearTimeout(m[k].t); run(m[k]); } });
  return s.g;
}
