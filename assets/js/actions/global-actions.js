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
  linkstate,
  scrollBody
};
