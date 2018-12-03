import { fire } from '../../components/unifire';

const LEFT = 37;
const RIGHT = 39;

function cb(e){
  if(!e || (e.keyCode !== LEFT && e.keyCode !== RIGHT)) return;
  let el = document.activeElement;
  if(el && el.matches('input') || el.matches('textarea') || el.hasAttribute('contenteditable')) return;
  let i = e.keyCode === LEFT ? -1 : 1;
  fire('shiftEntry', i)();
}

export default function(el) {
  el.addEventListener('keydown', cb);
}
