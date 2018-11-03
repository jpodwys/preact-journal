import handleRouteChange from '../route-handlers';

function linkstate (el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.set(obj, cb);
};

function executeRoute (el){
  handleRouteChange.call(el, location.pathname);
};

export default {
  linkstate,
  executeRoute
};
