function linkstate (el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.setState(obj, cb);
  if(key === 'dark') localStorage.setItem('dark', val);
};

// I tried replacing this with a linkstate call, but it didn't work.
function scrollBody (el, { scrollPosition }){
  el.setState({scrollPosition});
};

export default {
  linkstate,
  scrollBody
};
