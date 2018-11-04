function linkstate (el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.set(obj, cb);
};

export default {
  linkstate
};
