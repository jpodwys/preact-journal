export default function Router(onChange) {
  // Make sure new pages are always scrolled to the top
  // while history entries maintain their scroll position.
  let { pushState } = history;
  history.pushState = (a, b, url) => {
    pushState.call(history, a, b, url);
    scrollTo(0, 0);
  };

  const shouldFollowLink = function(node) {
    if (!node || !node.getAttribute) return false;
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

  const route = function(el, e){
    let func = (e.detail.replace) ? 'replace' : 'push';
    history[func + 'State'](null, null, e.detail.href);
    if(onChange) onChange(e.detail.href);
  };

  const click = function(el, e){
    if(!e || !e.target) return;
    let href = shouldFollowLink(getLinkTarget(e.target));
    if(href){
      e.preventDefault();
      route(el, {detail: {
        href: href
      }});
    }
  };

  const popstate = function(el, e){
    if(onChange) onChange(location.pathname);
  };

  return {route, click, popstate};
}
