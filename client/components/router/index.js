import { h, Component } from 'preact';

let ROUTER;
let ONCHANGE;

const shouldFollowLink = function(node) {
  if(!node || !node.getAttribute) return false;
  let href = node.getAttribute('href'),
    target = node.getAttribute('target');
  if (!href || !href.match(/^\//g) || (target && !target.match(/^_?self$/i))) return false;
  return href;
};

const getLinkTarget = function(target){
  while(target && target.nodeName !== 'A'){
    target = target.parentNode;
  }
  return target;
};

const clickListener = function(e) {
  if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
  let href = shouldFollowLink(getLinkTarget(e.target));
  if(href){
    e.preventDefault();
    route(href);
  }
};

const popstateListener = function(e) {
  if(ONCHANGE) ONCHANGE(location.pathname);
  if(ROUTER) ROUTER.setState({ url: location.pathname });
};

const route = function(url, replace){
  if(ONCHANGE) ONCHANGE(url);
  if(ROUTER) ROUTER.setState({ url: url });
  let func = replace ? 'replace' : 'push';
  history[func + 'State'](null, null, url);
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
    let paths = path.split('/');
    let urls = url.split('/');

    if(paths.length !== urls.length) return false;

    for(let i = 0; i < urls.length; i++){
      if(paths[i] !== urls[i] && paths[i][0] !== ':'){
        return false;
      }
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
