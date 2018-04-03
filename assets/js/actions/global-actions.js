// const focusin = function(el){
//   el.setState({inputFocused: true});
// };

// const focusout = function(el){
//   el.setState({inputFocused: false});
// };

const linkstate = function(el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.setState(obj, cb);
  if(key === 'dark') localStorage.setItem('dark', val);
};

const scrollBody = function(el){
  if(el.state.view === '/entries'){
    el.setState({scrollPosition: document.body.scrollTop});
  }
};

export default {
  // focusin,
  // focusout,
  linkstate,
  scrollBody
};
