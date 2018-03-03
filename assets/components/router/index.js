import { h, Component } from 'preact';

let ROUTER;
let ONCHANGE;

const shouldFollowLink = function(node) {
  if (!node || !node.getAttribute || node.hasAttribute('native')) return false;
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
  if(!e || !e.target) return;
  let href = shouldFollowLink(getLinkTarget(e.target));
  if(href){
    e.preventDefault();
    route(href);
  }
};

const popstateListener = function(e) {
  if(ONCHANGE) ONCHANGE(location.pathname);
  if(ROUTER) ROUTER.setState({url: location.pathname});
};

const route = function(url, replace){
  if(ONCHANGE) ONCHANGE(url);
  if(ROUTER) ROUTER.setState({url: url});
  let func = replace ? 'replace' : 'push';
  history[func + 'State'](null, null, url);
};

class Router extends Component {
  constructor(props) {
    super(props);
    ROUTER = this;
    this.state = {url: location.pathname};
    document.onclick = clickListener;
    window.onpopstate = popstateListener;
  }

  shouldComponentUpdate({ onChange }, { url }) {
    return url !== this.props.url || onChange !== this.props.onChange;
  }

  componentWillMount() {
    if(this.props.onChange){
      ONCHANGE = this.props.onChange;
      ONCHANGE(location.pathname);
    }
  }

  matchUrl(path, url) {
    return path === url || this.matchUrlWithWildCards(path, url);
  }

  matchUrlWithWildCards(path, url) {
    let paths = path.split('/').filter(String);
    let urls = url.split('/').filter(String);

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
      return this.matchUrl(path, url);
    });
  }

  render({ path, children, onChange }, { url }) {
    return this.matchPath(url, children)[0];
  }
}

export { Router, route };
export default Router;
