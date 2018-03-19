const focusin = function(el, e){
  el.setState({inputFocused: true});
};

const focusout = function(el, e){
  el.setState({inputFocused: false});
};

const linkstate = function(el, data){
  let obj = {};
  obj[data.key] = data.val;
  el.setState(obj, data.cb);
  if(data.key === 'dark') localStorage.setItem('dark', data.val);
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
