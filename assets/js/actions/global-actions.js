const shouldFollowLink = function(node) {
  if (!node || !node.getAttribute) return false;
  let href = node.getAttribute('href'),
    target = node.getAttribute('target');
  if (!href || !href.match(/^\//g) || (target && !target.match(/^_?self$/i))) return false;
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

const getLinkTarget = function(target){
  while(target && target.nodeName !== 'A'){
    target = target.parentNode;
  }
  return target;
};

const linkstate = function(el, e){
  let obj = {};
  obj[e.detail.key] = e.detail.val;
  el.setState(obj, e.detail.cb);
};

const scrollBody = function(el, e){
  if(el.state.view === '/entries'){
    el.setState({scrollPosition: document.body.scrollTop});
  }
};

const route = function(el, e){
  console.log('route', e)
  let func = (e.detail.replace) ? 'replace' : 'push';
  history[func + 'State'](e.detail.href, {});
  el.setState({view: e.detail.view});
};

const click = function(el, e){
  if(!e || !e.target) return;
  let href = shouldFollowLink(getLinkTarget(e.target));
  if(href){
    e.preventDefault();
    route(el, {detail: {
      href: href,
      view: getViewFromHref(href)
    }});
  }
};

const popstate = function(el, e){
  el.setState({view: getViewFromHref(location.href)});
};

export default {
  linkstate,
  scrollBody,
  route,
  click,
  popstate
};
