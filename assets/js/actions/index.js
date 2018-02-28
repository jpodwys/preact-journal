import User from './user-actions';
import Entry from './entry-actions';

const shouldFollowLink = function(node) {
  // only valid elements
  if (!node || !node.getAttribute) return false;

  let href = node.getAttribute('href'),
    target = node.getAttribute('target');

  // ignore links with targets and non-path URLs
  if (!href || !href.match(/^\//g) || (target && !target.match(/^_?self$/i))) return false;

  // attempt to route, if no match simply cede control to browser
  return href;
};

const getViewFromHref = function(href){
  if(~href.indexOf('/entries')){
    return '/entries';
  } else if(~href.indexOf('/entry/new')){
    return '/new'
  } else if(~href.indexOf('/entry')){
    return '/entry'
  } else {
    return '/';
  }
};

const actions = {
  linkstate: function(el, e){
    let obj = {};
    obj[e.detail.key] = e.detail.val;
    el.setState(obj, e.detail.cb);
  },

  scrollBody: function(el, e){
    if(el.state.view === '/entries'){
      el.setState({scrollPosition: document.body.scrollTop});
    }
  },

  click: function(el, e){
    if(!e || !e.detail || !e.detail.event || !e.detail.event.target) return;
    let target = e.detail.event.target;
    let href = shouldFollowLink(target);
    if(href) history.pushState(href);
    el.setState({view: getViewFromHref(href)});
  },

  popstate: function(el, e){
    el.setState({view: getViewFromHref(location.href)});
  }
};

export default Object.assign(User, Entry, actions);