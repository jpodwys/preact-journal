export default function freedux (el, actions) {
  Object.keys(actions).forEach(action => {
    // let func = actions[action].bind(this, el);
    document.addEventListener(action, function(e){
      actions[action](el, e.detail, e);
    });
  });
};
