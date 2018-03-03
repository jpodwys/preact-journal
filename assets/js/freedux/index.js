export default function freedux (el, actions) {
  Object.keys(actions).forEach(action => {
    let func = actions[action].bind(this, el);
    let container = (window['on' + action] === undefined) ? document : window;
    container.addEventListener(action, func);
  });
};
