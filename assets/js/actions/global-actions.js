function linkstate (el, { key, val, cb }){
  let obj = {};
  obj[key] = val;
  el.setState(obj, cb);
  if(key === 'dark') localStorage.setItem('dark', val);
};

function scrollBody (el){
  if(el.state.view === '/entries'){
    el.setState({scrollPosition: document.body.scrollTop});
  }
};

export default {
  linkstate,
  scrollBody
};
