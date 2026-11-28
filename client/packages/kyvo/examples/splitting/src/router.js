import { h, store } from '../../../core.js';

// Hash routing, so the whole app is a static folder: no server rule for deep links.
const here = () => location.hash.slice(1) || '/';
export const nav = store({ path: here() });
addEventListener('hashchange', () => { nav.path = here(); });

// '/notes/:id' against '/notes/7' -> { id: '7' }; null when it does not match.
export function match(pattern, path) {
  const p = pattern.split('/'), u = path.split('/');
  if (p.length !== u.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i][0] === ':') params[p[i].slice(1)] = decodeURIComponent(u[i]);
    else if (p[i] !== u[i]) return null;
  }
  return params;
}

let known = [];

// Renders the first route that matches. A route's component is a plain component, or a `lazy()` one: the router does
// not care, which is why splitting by route needs nothing from it. `key` remounts the page when a param changes.
export function Routes({ routes, notFound }) {
  known = routes;
  for (const [pattern, Page] of routes) {
    const params = match(pattern, nav.path);
    if (params) return h(Page, { params, key: pattern + JSON.stringify(params) });
  }
  return h(notFound, { path: nav.path });
}

// Hovering or focusing a link starts the route's chunk early, so a click often finds it already here.
export const Link = ({ to, children }) => {
  const early = () => known.forEach(([pattern, Page]) => { if (Page.preload && match(pattern, to)) Page.preload(); });
  return h('a', { href: '#' + to, onmouseenter: early, onfocus: early }, ...children);
};
