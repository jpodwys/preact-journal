import { h, store } from '../../packages/kyvo/core';
import { listen } from '../../packages/kyvo/helpers';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
const { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

// `location` IS the router state: the Router renders from location.pathname, so there is
// nothing to keep in sync. This store exists only so that a navigation re-renders the app.
const nav = store({ n: 0 });

// There is one Router; this is its live props (for onChange).
let LIVE;
const notify = url => LIVE && LIVE.onChange && LIVE.onChange(url);

const clickListener = e => {
  if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
  let node = e.target;
  while(node && node.nodeName !== 'A') node = node.parentNode;
  if(!node || !node.getAttribute) return;
  let href = node.getAttribute('href'),
    target = node.getAttribute('target');
  if(href && href[0] === '/' && (!target || /^_?self$/i.test(target))){
    e.preventDefault();
    route(href);
  }
};

const route = (url, replace) => {
  notify(url);
  history[replace ? 'replaceState' : 'pushState'](null, null, url);
  nav.n++;
};

const matches = (path, url) => {
  if(path === url) return true;
  const p = path.split('/'), u = url.split('/');
  return p.length <= u.length && u.every((s, i) => p[i] === s || (p[i] && p[i][0] === ':'));
};

function Router(props, ctx) {
  listen(ctx, document, 'click', clickListener);
  listen(ctx, window, 'popstate', () => { notify(location.pathname); nav.n++; });
  ctx.mount(() => {
    LIVE = props;
    notify(location.pathname);
    return () => { LIVE = undefined; };
  });
  return props.children.find(c => matches(c.props.path, location.pathname));
}

export { Router, route };
export default Router;
