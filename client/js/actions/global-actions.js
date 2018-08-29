function linkstate (el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.set(obj, cb);
};

// I tried replacing this with a linkstate call, but it didn't work.
function scrollBody (el, { scrollPosition }){
  el.set({scrollPosition});
};

export default {
  linkstate,
  scrollBody
};
