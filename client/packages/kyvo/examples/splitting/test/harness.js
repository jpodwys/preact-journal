import { render } from '../../../core.js';

export const settle = async () => {
  await Promise.resolve();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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

// Real events; every mounted root is then re-rendered synchronously, so a spec can assert right after an event.
const dispatch = (node, event) => { node.dispatchEvent(event); flushAll(); };
export const fire = {
  click: node => dispatch(node, new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })),
  submit: node => dispatch(node, new Event('submit', { bubbles: true, cancelable: true })),
  input: (node, value) => { node.value = value; dispatch(node, new Event('input', { bubbles: true })); },
  hover: node => dispatch(node, new MouseEvent('mouseenter'))
};

const ROLES = { button: 'button', textbox: 'input, textarea', form: 'form', list: 'ul, ol', alert: '[role=alert]', status: '[role=status]', link: 'a', region: 'section' };
const name = el => el.getAttribute('aria-label') ?? el.textContent;
export function all(host, role, n) {
  return Array.from(host.querySelectorAll(ROLES[role])).filter(el => n == null || (n instanceof RegExp ? n.test(name(el)) : name(el) === n));
}
export function get(host, role, n) {
  const found = all(host, role, n);
  if (found.length !== 1) throw new Error(`expected one ${role} ${n ?? ''}, found ${found.length}: ${host.innerHTML.slice(0, 300)}`);
  return found[0];
}
export const query = (host, role, n) => all(host, role, n)[0] || null;
