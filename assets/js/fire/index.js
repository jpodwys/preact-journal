export default function fire(name, detail) {
  return function(e) {
    let event = new CustomEvent(name, {detail: [detail, e]});
    document.dispatchEvent(event);
  }
};
