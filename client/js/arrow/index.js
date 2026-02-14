import { fire } from '../../components/unifire';

function cb(e){
  if(!e || (e.keyCode !== 37 && e.keyCode !== 39)) return;
  let el = document.activeElement;
  if(el && el.matches('input') || el.matches('textarea') || el.hasAttribute('contenteditable')) return;
  fire('shiftEntry', e.keyCode === 37 ? -1 : 1);
}

export default function(el) {
  el.addEventListener('keydown', cb);
}
