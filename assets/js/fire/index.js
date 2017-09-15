export default function fire(name, detail, el) {
  return function() {
    if(!name) return;
    el = el || document;
    if(detail) detail = {detail: detail};
    var event = new CustomEvent(name, detail);
    el.dispatchEvent(event);
  }
};
