import { h, render } from '../client/packages/kyvo/core';
import { app, resetState } from '../client/js/app-state';

// Renders are always deferred to requestAnimationFrame (that is the framework's
// only scheduler), so tests wait with `await settle()`. Real events dispatched
// through `fireEvent` additionally re-render every mounted root synchronously
// afterwards (render() is synchronous), so component specs can assert right
// after a click without awaiting a frame.
export async function settle () {
  await Promise.resolve();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// The shipped build (and the minified test:prod bundle) defines __DEV__ as false, which
// strips the framework's dev-only checks (deep-freeze TypeErrors, call-misuse errors,
// the render-loop guard). A spec asserting one of those must use `devOnly(...)` instead of
// `it(...)`: it runs in the normal suite and is skipped in the prod-shaped bundles.
export const devOnly = (typeof __DEV__ === 'undefined' || __DEV__) ? it : it.skip;

const mounted = new Set();
const flushAll = () => mounted.forEach(m => render(m.vnode, m.host));

// `state` is merged over a freshly computed initial state (the store is a
// module singleton, so every mount starts from a clean slate).
export function mount (vnode, { state = {} } = {}) {
  resetState();
  // viewEntries() is derived from entries/view/filter/sort, so a spec that lists the rows to
  // show gives them as `entries` (unless it also gives entries).
  const { viewEntries, entry, entryIndex, ...rest } = state;
  let list = rest.entries || viewEntries;
  // The entry on screen is stored as its id, and found in the list. `entry` is shorthand for that: it goes into the
  // list in place of the row with its id, or first when the list has none. (`entryIndex` is derived, so it is ignored.)
  if(entry) {
    list = list || [];
    list = list.some(e => e.id === entry.id) ? list.map(e => e.id === entry.id ? entry : e) : [entry, ...list];
  }
  if('entry' in state) rest.entryId = entry ? entry.id : undefined;
  if(list) rest.entries = list;
  Object.assign(app, rest);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const m = { vnode, host };
  mounted.add(m);
  render(vnode, host);
  return {
    host,
    flush: () => render(vnode, host),
    cleanup () {
      mounted.delete(m);
      render(null, host);
      host.remove();
    },
    getByText: (matcher) => getByText(host, matcher),
    queryByText: (matcher) => queryByText(host, matcher),
    getByRole: (role, opts) => getByRole(host, role, opts),
    queryByRole: (role, opts) => queryByRole(host, role, opts)
  };
}

// fireEvent(node, 'click') still works; fireEvent.click(node) is the
// RTL-shaped form preferred in new tests.
//
// Note: fireEvent.click on an <input type="submit"> dispatches a synthetic
// click that does NOT cascade into a form submit (matches RTL semantics).
// To trigger the form's onsubmit, call fireEvent.submit(form) instead.
function dispatch (node, event) {
  node.dispatchEvent(event);
  flushAll();
  return event;
}

export function fireEvent (node, type, init) {
  return dispatch(node, new Event(type, Object.assign({ bubbles: true, cancelable: true }, init)));
}
fireEvent.click  = (node) => {
  // Use MouseEvent so e.button === 0 — generic Event leaves it undefined,
  // which trips Router's `e.button !== 0` early-return for non-primary clicks.
  return dispatch(node, new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
};
fireEvent.submit = (node) => fireEvent(node, 'submit');
fireEvent.focus  = (node) => fireEvent(node, 'focus');
fireEvent.blur   = (node) => fireEvent(node, 'blur');
fireEvent.input  = (node, value) => {
  if(value !== undefined) node.value = value;
  return fireEvent(node, 'input');
};
fireEvent.change = (node, value) => {
  if(value !== undefined) node.value = value;
  return fireEvent(node, 'change');
};

// ---- queries ----

function normalize (text) {
  return (text == null ? '' : String(text)).replace(/\s+/g, ' ').trim();
}

function matchText (content, matcher) {
  const normalized = normalize(content);
  if(matcher instanceof RegExp) return matcher.test(normalized);
  return normalized === normalize(matcher);
}

// Walks every element under `host` and matches against the element's own
// direct text-node children (so wrapping ancestors don't all match).
function findByText (host, matcher) {
  const elements = host.querySelectorAll('*');
  for(let i = 0; i < elements.length; i++) {
    const el = elements[i];
    let own = '';
    for(let j = 0; j < el.childNodes.length; j++) {
      const n = el.childNodes[j];
      if(n.nodeType === 3) own += n.textContent;
    }
    if(own && matchText(own, matcher)) return el;
  }
  return null;
}

export function getByText (host, matcher) {
  const node = findByText(host, matcher);
  if(!node) {
    throw new Error(
      `getByText: no element matches ${formatMatcher(matcher)}. ` +
      `Note: only direct text-node children are matched; ` +
      `text split across child elements (e.g. <button>Click <strong>me</strong></button>) won't match a single string.`
    );
  }
  return node;
}

export function queryByText (host, matcher) {
  return findByText(host, matcher);
}

const ROLE_SELECTORS = {
  button:   'button, input[type="submit"], input[type="button"]',
  link:     'a[href]',
  textbox:  'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], textarea',
  checkbox: 'input[type="checkbox"]',
  form:     'form',
  heading:  'h1, h2, h3, h4, h5, h6',
  list:     'ul, ol',
  listitem: 'li',
  img:      'img',
  banner:   'header'
};

// Accessible name: an explicit aria-label wins (it's the author's deliberate
// name for a non-text element, e.g. an icon button), otherwise fall back to
// the element's own text content.
function accessibleName (el) {
  const label = el.getAttribute('aria-label');
  return label != null ? label : el.textContent;
}

function findByRole (host, role, options) {
  const implicitSelector = ROLE_SELECTORS[role];
  if(!implicitSelector) throw new Error(`getByRole: unsupported role "${role}"`);
  // An element gets a role either implicitly (matches the tag-based selector
  // above) or explicitly via role="x" — real accessible-name computation
  // supports both, and icon buttons in this app rely on the explicit form.
  const selector = `${implicitSelector}, [role="${role}"]`;
  const matches = host.querySelectorAll(selector);
  if(!options || options.name == null) return matches[0] || null;
  for(let i = 0; i < matches.length; i++) {
    if(matchText(accessibleName(matches[i]), options.name)) return matches[i];
  }
  return null;
}

export function getByRole (host, role, options) {
  const node = findByRole(host, role, options);
  if(!node) {
    const name = options && options.name != null ? ` with name ${formatMatcher(options.name)}` : '';
    throw new Error(`getByRole: no element with role "${role}"${name}`);
  }
  return node;
}

export function queryByRole (host, role, options) {
  return findByRole(host, role, options);
}

function formatMatcher (matcher) {
  if(matcher instanceof RegExp) return matcher.toString();
  return JSON.stringify(matcher);
}
