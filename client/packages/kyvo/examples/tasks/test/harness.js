import { h, render } from '../../../core.js';
import { tasks } from '../src/store.js';

export const settle = async () => {
  await Promise.resolve();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
export const wait = ms => new Promise(r => setTimeout(r, ms));

export const resetTasks = (items = []) => {
  localStorage.clear();
  Object.assign(tasks, { items, filter: 'all', query: '', selected: null, modal: null });
};

const mounted = new Set();
const flushAll = () => mounted.forEach(m => render(m.vnode, m.host));

export function mount(vnode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const m = { vnode, host };
  mounted.add(m);
  render(vnode, host);
  return { host, cleanup() { mounted.delete(m); render(null, host); host.remove(); } };
}

// Real events; every mounted root is then re-rendered synchronously (render() is synchronous),
// so a spec can assert right after an event. Timers and promises still need `await settle()`.
const dispatch = (node, event) => { node.dispatchEvent(event); flushAll(); return event; };
export const fire = {
  click: node => dispatch(node, new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })),
  submit: node => dispatch(node, new Event('submit', { bubbles: true, cancelable: true })),
  change: node => dispatch(node, new Event('change', { bubbles: true })),
  blur: node => dispatch(node, new Event('blur')),
  input: (node, value) => { node.value = value; return dispatch(node, new Event('input', { bubbles: true })); },
  key: (node, key) => dispatch(node, new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
  type: (node, text) => { for (let i = 1; i <= text.length; i++) fire.input(node, text.slice(0, i)); }
};

const ROLES = {
  button: 'button', checkbox: 'input[type=checkbox]', textbox: 'input:not([type]), input[type=text]',
  form: 'form', list: 'ul', alert: '[role=alert]', dialog: '[role=dialog]', group: '[role=group]',
  region: 'section', heading: 'h1,h2'
};
const name = el => el.getAttribute('aria-label') ?? el.textContent;
export function queryAll(host, role, n) {
  return Array.from(host.querySelectorAll(ROLES[role])).filter(el => n == null || (n instanceof RegExp ? n.test(name(el)) : name(el) === n));
}
export function get(host, role, n) {
  const found = queryAll(host, role, n);
  if (!found.length) throw new Error(`no ${role}${n ? ' named ' + n : ''} in: ${host.textContent}`);
  return found[0];
}
export const query = (host, role, n) => queryAll(host, role, n)[0] || null;
export const titles = host => queryAll(host, 'button').filter(b => b.className === 'title').map(b => b.textContent);
