export default function fire(name, detail) {
  return function() {
    if(detail) detail = {detail: detail};
    var event = new CustomEvent(name, detail);
    document.dispatchEvent(event);
  }
};
