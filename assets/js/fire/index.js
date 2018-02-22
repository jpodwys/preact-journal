export default function fire(name, detail) {
  return function(e) {
    var obj;
    if(detail) obj = {detail: detail};
    else if(e) obj = {detail: {value: e.target.value}};
    var event = new CustomEvent(name, obj);
    document.dispatchEvent(event);
  }
};
