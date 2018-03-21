export default function freedux (el, actions) {
  Object.keys(actions).forEach(action => {
    document.addEventListener(action, function(e){
      let params = e.detail || [undefined, undefined];
      actions[action](el, params[0], params[1]);
    });
  });
};
