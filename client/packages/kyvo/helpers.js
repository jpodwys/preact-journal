// Userland helpers: plain functions that take ctx (and `lazy`, which makes a component). Tree-shaken when unused.
import { h } from './core.js';

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

// A component whose code arrives on first render. `load` returns a promise of the component, or of a module whose
// default export is it: `lazy(() => import('./stats.js'))`. The bundler turns that `import()` into a separate file
// (esbuild `splitting`), so this is how a route's code is kept out of the first download.
//
// The code loads once, however many instances there are. While it loads the component renders `Loading` (nothing when
// omitted); if it fails it renders `Failed` with `{ error, retry }`, and `retry()` tries again. Once loaded it renders
// the real component with the same props and children. `L.preload()` starts the load early (on hover, say) and
// returns the promise. A write is what triggers a render, so each instance writes to its own state when the load settles.
export function lazy(load, Loading, Failed) {
  let C, err, p;
  const go = () => p ||= new Promise(r => r(load())).then(m => { C = m.default || m; }, x => { err = { x }; });
  const L = (props, ctx) => {
    const s = ctx.state({ n: 0 }), wake = () => { s.n++; };
    ctx.mount(() => { if (!C) go().then(wake); });
    if (C) return h(C, props, ...props.children);
    if (err) return Failed ? h(Failed, { error: err.x, retry: () => { err = p = 0; go().then(wake); wake(); } }) : null;
    go();
    return Loading ? h(Loading) : null;
  };
  L.preload = go;
  return L;
}
