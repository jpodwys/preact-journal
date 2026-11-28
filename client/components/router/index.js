import { h } from '../../packages/kyvo/core';
import { listen } from '../../packages/kyvo/helpers';
import { route, nav, notify, onRoute } from '../../js/route';

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

const matches = (path, url) => {
  if(path === url) return true;
  const p = path.split('/'), u = url.split('/');
  return p.length <= u.length && u.every((s, i) => p[i] === s || (p[i] && p[i][0] === ':'));
};

function Router(props, ctx) {
  listen(ctx, document, 'click', clickListener);
  listen(ctx, window, 'popstate', () => { notify(location.pathname); nav.n++; });
  // There is one Router. `props` is its live object, so onChange is read at call time.
  ctx.mount(() => {
    onRoute(url => props.onChange && props.onChange(url));
    notify(location.pathname);
    return () => onRoute();
  });
  return props.children.find(c => c && matches(c.props.path, location.pathname));
}

export { Router, route };
export default Router;
