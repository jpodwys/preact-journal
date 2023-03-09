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
  let date;
  let text;
  const url = ROUTER.state.url;
  document.documentElement.classList.add('back');
  const transition = document.startViewTransition(() => {
    return new Promise((resolve) => {
      if(ROUTER) ROUTER.setState({ url: location.pathname });
      if(ONCHANGE) ONCHANGE(location.pathname);
      setTimeout(() => {
        date = document.querySelector(`a[href="${url}"] .first-row`);
        text = document.querySelector(`a[href="${url}"] .second-row`);
        if (date && text) {
          date.style.viewTransitionName = 'entryDate';
          text.style.viewTransitionName = 'entryText';
        }
        resolve();
      }, 100);
    });
  });
  transition.finished.finally(() => {
    if (date && text) {
      date.style.viewTransitionName = '';
      text.style.viewTransitionName = '';
    }
    document.documentElement.classList.remove('back');
  });
};

const route = function(url, replace, isBack){
  if (isBack) {
    document.documentElement.classList.add('back');
  }
  const date = document.querySelector(`a[href="${url}"] .first-row`);
  const text = document.querySelector(`a[href="${url}"] .second-row`);
  if (date && text) {
    date.style.viewTransitionName = 'entryDate';
    text.style.viewTransitionName = 'entryText';
  }
  const transition = document.startViewTransition(() => {
    if(ROUTER) ROUTER.setState({ url: url });
    if(ONCHANGE) ONCHANGE(url);
    let func = replace ? 'replace' : 'push';
    history[func + 'State'](null, null, url);
  });
  transition.finished.finally(() => {
    if (date && text) {
      date.style.viewTransitionName = '';
      text.style.viewTransitionName = '';
    }
    document.documentElement.classList.remove('back');
  });
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
    const paths = path.split('/');
    const urls = url.split('/');

    if(paths.length > urls.length) return false;

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
