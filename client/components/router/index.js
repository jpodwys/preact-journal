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

const popstateListener = e => {
  if(ONCHANGE) ONCHANGE(location.pathname);
  if(ROUTER) ROUTER.setState({ url: location.pathname });
};

const route = (url, replace) => {
  if(ONCHANGE) ONCHANGE(url);
  if(ROUTER) ROUTER.setState({ url });
  history[replace ? 'replaceState' : 'pushState'](null, null, url);
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

  componentWillUnmount() {
    // Only clean up the globals this Router installed. If a later Router
    // mount has overwritten them, leave them alone — the new owner is
    // responsible for its own cleanup.
    if(ROUTER === this) {
      ROUTER = undefined;
      ONCHANGE = undefined;
      document.onclick = null;
      window.onpopstate = null;
    }
  }

  render({ children }, { url }) {
    return children.find(c => {
      const path = c.attributes.path;
      if(path === url) return true;
      const p = path.split('/'), u = url.split('/');
      return p.length <= u.length && u.every((s, i) => p[i] === s || (p[i] && p[i][0] === ':'));
    });
  }
}

export { Router, route };
export default Router;
