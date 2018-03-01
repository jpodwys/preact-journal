const linkstate = function(el, e){
  let obj = {};
  obj[e.detail.key] = e.detail.val;
  el.setState(obj, e.detail.cb);
};

const scrollBody = function(el, e){
  console.log('scrolled')
  if(el.state.view === '/entries'){
    el.setState({scrollPosition: document.body.scrollTop});
  }
};

export default {
  linkstate,
  scrollBody
};
