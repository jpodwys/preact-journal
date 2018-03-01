export default function fire(name, detail) {
  return function(e) {
    let obj;
    if(detail) obj = {detail: detail};
    else if(e) obj = {detail: {value: e.target.value}};
    let event = new CustomEvent(name, obj);
    document.dispatchEvent(event);
  }
};
