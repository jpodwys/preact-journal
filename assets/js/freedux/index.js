export default function freedux (el, actions) {
  if (typeof window === "undefined") return;
  Object.keys(actions).forEach(action => {
    let func = actions[action].bind(this, el);
    document.addEventListener(action, func, false);
  });
};
