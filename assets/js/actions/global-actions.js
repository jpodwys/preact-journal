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

function setEntryTop (el, data, e){
  let num = data && typeof data.override !== 'undefined'
    ? data.override
    : e.currentTarget.getBoundingClientRect().top - 106;

  el.setState({
    entryTop: 'top:' + num + 'px'
  });
};

export default {
  linkstate,
  scrollBody,
  setEntryTop
};
