// kyvo core. See SPEC.md. Brute force: any write schedules ONE render of
// the whole tree from the root; a small keyed vdom diff keeps that cheap.
// Fields prefixed `_` are internal (mangled by esbuild's mangleProps /^_/).
// Dev-only code is guarded inline by `typeof __DEV__ === 'undefined' || __DEV__`
// so a build that defines __DEV__ as false drops it.

export function h(type, props, ...children) {
  props = props || {};
  return { type, props: { ...props, children: children.flat(Infinity).filter(c => c != null && c !== !!c) }, key: props.key };
}

// ---------------------------------------------------------------- scheduling
let root, rendering, scheduled, wrote, chain = 0, mountQueue = [], refQueue = [];

function schedule() {
  if (!scheduled) { scheduled = 1; requestAnimationFrame(flush); }
}

function flush() {
  scheduled = 0;
  if (typeof __DEV__ === 'undefined' || __DEV__) {
    const w = wrote;
    wrote = 0;
    if (w && ++chain >= 25) {
      chain = 0;
      throw new Error(`render loop: "${String(w.k)}" was written during render 25 times in a row`);
    }
    if (!w) chain = 0;
  }
  root && render(...root);
}

// ---------------------------------------------------------------- store
const W = Symbol();

// Shallow, set-trap-only proxy. `notify(key)` is called after every changed write.
export function store(obj, notify) {
  let fns;
  return new Proxy(obj, {
    set(t, k, v) {
      if (k === W) { (fns || (fns = [])).push(v); return true; }
      const prev = t[k];
      if (Object.is(prev, v)) return true;
      if (typeof __DEV__ === 'undefined' || __DEV__) freeze(v);
      t[k] = v;
      if (notify) notify(k);
      else {
        if ((typeof __DEV__ === 'undefined' || __DEV__) && rendering) wrote = { k };
        schedule();
      }
      if (fns) for (const f of fns) f(k, v, prev);
      return true;
    }
  });
}

export const watch = (px, fn) => { px[W] = fn; };

function freeze(v) {
  if (v && typeof v == 'object' && !Object.isFrozen(v) && (Array.isArray(v) || Object.getPrototypeOf(v) == Object.prototype)) {
    Object.freeze(v);
    for (const k in v) freeze(v[k]);
  }
}

// ---------------------------------------------------------------- ctx
// A component's internal record IS its ctx (created from `proto`): one object per
// instance, so `this` in the methods below is the instance. `_`-fields are internal.
const D = Symbol();

const proto = {
  state(init, key = D) {
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      const u = this._u || (this._u = new Set());
      if (u.has(key)) throw new Error('ctx.state: slot already used this render (a second unkeyed ctx.state(), or the same key twice); pass a key');
      u.add(key);
    }
    const s = this._s || (this._s = {});
    return s[key] || (s[key] = store(typeof init == 'function' ? init() : init, () => this._r || schedule()));
  },
  mount(fn) {
    if (typeof __DEV__ === 'undefined' || __DEV__) this._n++;
    if (this._ok) {
      if ((typeof __DEV__ === 'undefined' || __DEV__) && this._n > this._n0) throw new Error('ctx.mount: registered after the first render (a conditional ctx.mount or listen); register unconditionally');
      return;
    }
    mountQueue.push(() => {
      const c = fn();
      if (typeof c == 'function') (this._cl || (this._cl = [])).push(c);
    });
  }
};

// ---------------------------------------------------------------- renderer
const setStyle = (st, k, v) => (k[0] == '-' ? st.setProperty(k, v == null ? '' : v) : (st[k] = v == null ? '' : v));
function setAttr(dom, name, value, old, svg) {
  if (name == 'style') {
    // A string, a missing style, or a switch between string and object starts from scratch (one cssText write, so no intermediate
    // style recalculation). Between two objects only the keys that changed are written, and removed keys are cleared.
    const str = typeof value == 'string', fresh = str || !value || !old || typeof old == 'string';
    if (fresh) dom.style.cssText = str ? value : '';
    else for (const k in old) if (!(k in value)) setStyle(dom.style, k, '');
    if (!str && value) for (const k in value) if (fresh || value[k] !== old[k]) setStyle(dom.style, k, value[k]);
  } else if (name[0] == 'o' && name[1] == 'n') {
    const e = name.slice(2).toLowerCase();
    // One stable listener per event name; the current handler lives in a table, so a new inline function on every render is a
    // property write, not a removeEventListener + addEventListener.
    const l = dom._l || (dom._l = {});
    if (!(e in l)) dom.addEventListener(e, ev => l[e] && l[e](ev));
    l[e] = value;
  } else if (name != 'children' && name != 'key' && name != 'ref') {
    // Property when the element has one (value, checked, disabled, href, ...), else attribute.
    const gone = value == null || value === false;
    if (!svg && name in dom && name != 'list' && name != 'form') dom[name] = gone ? '' : value;
    else if (!gone) dom.setAttribute(name, value === true ? '' : value);
    if (gone) dom.removeAttribute(name);
  }
}

// `value` and `checked` are applied after the children exist (a select needs its options) and after type/min/max (a range clamps).
const late = k => +(k == 'value' || k == 'checked');
function diffAttrs(dom, next, prev, svg, pass = 0) {
  for (const k in prev) if (!(k in next) && late(k) == pass) setAttr(dom, k, null, prev[k], svg);
  for (const k in next) if (next[k] !== prev[k] && late(k) == pass) setAttr(dom, k, next[k], prev[k], svg);
}

const rootDom = i => i._c ? rootDom(i._c) : i._dom;
// Children match by key; an unkeyed child's key is its position.
const keyOf = (v, j) => v?.key ?? '#' + j;

// `svg`: inside an <svg> subtree. It is passed down from the root on every render
// (components never re-render on their own), so no node needs to remember it.
function createDom(vnode, svg) {
  if (typeof vnode != 'object') return { _dom: document.createTextNode(vnode), _vnode: vnode };
  if (typeof vnode.type == 'function') {
    const i = Object.create(proto);
    i._vnode = vnode;
    i._props = {};
    i._c = createDom(run(i), svg);
    return i;
  }
  const s = svg || vnode.type == 'svg';
  const dom = s ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type) : document.createElement(vnode.type);
  const i = { _dom: dom, _vnode: vnode, _kids: [] };
  diffAttrs(dom, vnode.props, {}, s);
  if (vnode.props.ref) refQueue.push(() => vnode.props.ref(dom));
  if (typeof __DEV__ === 'undefined' || __DEV__) checkKeys(vnode.props.children);
  vnode.props.children.forEach((c, j) => {
    const k = createDom(c, s);
    k._k = keyOf(c, j);
    i._kids.push(k);
    dom.appendChild(rootDom(k));
  });
  diffAttrs(dom, vnode.props, {}, s, 1);
  return i;
}

// Runs a component function; props are one live object per instance. A null/false
// result becomes an empty text node.
function run(i) {
  const p = i._props, next = i._vnode.props;
  for (const k in p) if (!(k in next)) delete p[k];
  Object.assign(p, next);
  if (typeof __DEV__ === 'undefined' || __DEV__) { i._n = 0; i._u = 0; }
  let out;
  i._r = 1;
  try { out = i._vnode.type(p, i); } finally { i._r = 0; }
  if (!i._ok) { i._ok = 1; i._n0 = i._n; }
  return out || out === 0 ? out : '';
}

function unmount(i) {
  if (i._cl) for (const f of i._cl) f();
  if (i._kids) {
    const r = i._vnode.props.ref;
    if (r) r(null);
    for (const k of i._kids) unmount(k);
  }
  if (i._c) unmount(i._c);
}

function remove(i, parent, before) {
  const dom = rootDom(i);
  if (before == dom) before = dom.nextSibling;
  unmount(i);
  parent.removeChild(dom);
  return before;
}

function diffInternal(i, vnode, parent, before, svg) {
  const old = i && i._vnode;
  if (typeof vnode != 'object') {
    if (i && typeof old != 'object') {
      // Compare with the previous VNODE, not the live DOM, so text a user has
      // edited (contenteditable) is left alone until the virtual text changes.
      if (old !== vnode) i._dom.nodeValue = vnode;
      i._vnode = vnode;
      return i;
    }
  } else if (old && old.type === vnode.type) {
    i._vnode = vnode;
    if (typeof vnode.type == 'function') {
      const dom = rootDom(i);
      i._c = diffInternal(i._c, run(i), dom.parentNode, dom.nextSibling, svg);
    } else {
      const s = svg || vnode.type == 'svg', o = old.props.ref, n = vnode.props.ref;
      if (o !== n) { if (o) o(null); if (n) refQueue.push(() => n(i._dom)); }
      diffAttrs(i._dom, vnode.props, old.props, s);
      diffChildren(i, vnode.props.children, s);
      diffAttrs(i._dom, vnode.props, old.props, s, 1);
    }
    return i;
  }
  if (i) before = remove(i, parent, before);
  const fresh = createDom(vnode, svg);
  parent.insertBefore(rootDom(fresh), before || null);
  return fresh;
}

// Dev only: two children with one key cannot both be matched to a previous node, so the second would be created fresh every render.
function checkKeys(kids) {
  const seen = new Set();
  kids.forEach((v, j) => {
    const k = keyOf(v, j);
    if (seen.has(k)) throw new Error(`duplicate key "${String(k)}" among one element's children; keys must be unique`);
    seen.add(k);
  });
}

function diffChildren(i, kids, svg) {
  if (typeof __DEV__ === 'undefined' || __DEV__) checkKeys(kids);
  const dom = i._dom, old = new Map(i._kids.map(o => [o._k, o])), next = [];
  let prev;
  kids.forEach((v, j) => {
    const k = keyOf(v, j), before = prev ? prev.nextSibling : dom.firstChild;
    const r = diffInternal(old.get(k), v, dom, before, svg), d = rootDom(r), at = prev ? prev.nextSibling : dom.firstChild;
    old.delete(k);
    r._k = k;
    // Reposition only nodes still attached here (`d` may have been replaced by the user (contenteditable), and `at` by the child's
    // own re-render). `at` is read after the child is diffed, so a node diffInternal just inserted in place is not inserted again.
    // moveBefore keeps focus, selection and CSS animations that a remove + insert would reset.
    if (d !== at && d.parentNode === dom && (!at || at.parentNode === dom)) dom.moveBefore ? dom.moveBefore(d, at) : dom.insertBefore(d, at);
    next.push(r);
    prev = d;
  });
  for (const o of old.values()) remove(o, dom);
  i._kids = next;
}

function drain() {
  const q = refQueue.concat(mountQueue); // after commit: every ref first, then every mount callback
  let err, bad;
  mountQueue = [];
  refQueue = [];
  for (const f of q) try { f(); } catch (e) { if (!bad) { bad = 1; err = e; } }
  if (bad) throw err;
}

export function render(vnode, el) {
  if (typeof __DEV__ === 'undefined' || __DEV__) rendering = 1;
  try { el._t = diffInternal(el._t, vnode || '', el); }
  catch (e) { mountQueue = []; refQueue = []; throw e; }
  finally { if (typeof __DEV__ === 'undefined' || __DEV__) rendering = 0; }
  root = vnode ? [vnode, el] : root && root[1] == el ? 0 : root;
  drain();
}
