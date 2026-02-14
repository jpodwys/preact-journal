import { h, Component } from 'preact';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
const { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

let ROUTER;
let ONCHANGE;

const shouldFollowLink = node => {
  if(node && node.getAttribute) {
    let href = node.getAttribute('href'),
      target = node.getAttribute('target');
    if(href && href[0] === '/' && (!target || /^_?self$/i.test(target))) return href;
  }
};

const getLinkTarget = target => {
  while(target && target.nodeName !== 'A'){
    target = target.parentNode;
  }
  return target;
};

const clickListener = e => {
  if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
  let href = shouldFollowLink(getLinkTarget(e.target));
  if(href){
    e.preventDefault();
    route(href);
  }
};

const popstateListener = e => {
  if(ONCHANGE) ONCHANGE(location.pathname);
  if(ROUTER) ROUTER.setState({ url: location.pathname });
};

const route = (url, replace) => {
  if(ONCHANGE) ONCHANGE(url);
  if(ROUTER) ROUTER.setState({ url });
  history[replace ? 'replaceState' : 'pushState'](null, null, url);
};

const matchWild = (path, url) => {
  let p = path.split('/'), u = url.split('/');
  return p.length <= u.length && u.every((s, i) => p[i] === s || (p[i] && p[i][0] === ':'));
};

class Router extends Component {
  constructor() {
    super();
    this.state = { url: location.pathname };
  }

  shouldComponentUpdate({ onChange }, { url }) {
    return url !== this.props.url || onChange !== this.props.onChange;
  }

  componentWillMount() {
    ROUTER = this;
    document.onclick = clickListener;
    window.onpopstate = popstateListener;
    if(this.props.onChange){
      ONCHANGE = this.props.onChange;
      ONCHANGE(location.pathname);
    }
  }

  matchUrlWithWildCards(path, url) {
    return matchWild(path, url);
  }

  matchPath(url, children) {
    return children.filter(c => c.attributes.path === url || matchWild(c.attributes.path, url));
  }

  render({ children }, { url }) {
    return this.matchPath(url, children)[0];
  }
}

export { Router, route };
export default Router;
