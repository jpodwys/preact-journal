import { h, render, options } from 'preact';
import { Provider } from '../client/components/unifire';

// Render synchronously in tests so DOM assertions can run immediately after
// a state change instead of waiting on Preact's animation-frame batch.
options.debounceRendering = f => f();

export function mount (vnode, { state = {}, actions = {} } = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  // Preact 8's render needs the prior root passed as `merge` to diff
  // against (and thus unmount) the existing tree on the next call.
  const rendered = render(h(Provider, { state, actions }, vnode), host);
  return {
    host,
    cleanup () {
      // Diff the live tree against an empty placeholder so Preact 8 fires
      // componentWillUnmount on any class components. `<span>` is just a
      // throwaway vnode — Preact 8 doesn't unmount on null/undefined.
      render(h('span', null), host, rendered);
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
export function fireEvent (node, type, init) {
  const event = new Event(type, Object.assign({ bubbles: true, cancelable: true }, init));
  node.dispatchEvent(event);
  return event;
}
fireEvent.click  = (node) => fireEvent(node, 'click');
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
  img:      'img'
};

function findByRole (host, role, options) {
  const selector = ROLE_SELECTORS[role];
  if(!selector) throw new Error(`getByRole: unsupported role "${role}"`);
  const matches = host.querySelectorAll(selector);
  if(!options || options.name == null) return matches[0] || null;
  for(let i = 0; i < matches.length; i++) {
    if(matchText(matches[i].textContent, options.name)) return matches[i];
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
