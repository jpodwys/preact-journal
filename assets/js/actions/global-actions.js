const focusin = function(el, e){
  el.setState({inputFocused: true});
};

const focusout = function(el, e){
  el.setState({inputFocused: false});
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

export default {
  focusin,
  focusout,
  linkstate,
  scrollBody
};
