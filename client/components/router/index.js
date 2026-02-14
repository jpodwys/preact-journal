import { h, Component } from 'preact';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
const { pushState } = history;
history.pushState = (a, b, url) => { pushState.call(history, a, b, url); scrollTo(0, 0); };

let ROUTER, ONCHANGE;

const route = (url, replace) => {
  if (ONCHANGE) ONCHANGE(url);
  if (ROUTER) ROUTER.setState({ url });
  history[(replace ? 'replace' : 'push') + 'State'](null, null, url);
};

document.onclick = e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button) return;
  let t = e.target;
  while (t && t.nodeName !== 'A') t = t.parentNode;
  if (!t || !t.getAttribute) return;
  let href = t.getAttribute('href'), target = t.getAttribute('target');
  if (href && /^\//.test(href) && (!target || /^_?self$/i.test(target))) {
    e.preventDefault();
    route(href);
  }
};

window.onpopstate = () => {
  if (ONCHANGE) ONCHANGE(location.pathname);
  if (ROUTER) ROUTER.setState({ url: location.pathname });
};

class Router extends Component {
  constructor() {
    super();
    this.state = { url: location.pathname };
  }

  shouldComponentUpdate(_, { url }) {
    return url !== this.state.url;
  }

  componentWillMount() {
    ROUTER = this;
    if (this.props.onChange) {
      ONCHANGE = this.props.onChange;
      ONCHANGE(location.pathname);
    }
  }

  matchUrlWithWildCards(path, url) {
    let ps = path.split('/'), us = url.split('/');
    if (ps.length !== us.length) return false;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i] !== us[i] && ps[i][0] !== ':') return false;
    }
    return true;
  }

  matchPath(url, children) {
    return children.filter(child => {
      let path = child.attributes.path;
      return path === url || this.matchUrlWithWildCards(path, url);
    });
  }

  render({ children }, { url }) {
    return this.matchPath(url, children)[0];
  }
}

export { Router, route };
export default Router;
