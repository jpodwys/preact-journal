export default function freedux (el, actions) {
  Object.keys(actions).forEach(action => {
    document.addEventListener(action, function(e){
      actions[action](el, e.detail, e);
    });
  });
};
