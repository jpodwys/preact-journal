import { fire } from '../../components/unifire';

// Adapted from here: http://codepen.io/yzubizarreta/pen/ojJBQp
var startX, // X coordinate on touchstart
    startY, // Y coordinate on touchstart
    startTime; // Time on swipeStart

function start(e) {
  e = e.changedTouches ? e.changedTouches[0] : e;
  startX = e.pageX;
  startY = e.pageY;
  startTime = Date.now();
}

function end(e) {
  const el = document.activeElement;
  if(el && el.matches('input') || el.matches('textarea') || el.hasAttribute('contenteditable')) return;
  e = e.changedTouches ? e.changedTouches[0] : e;
  var dx = e.pageX - startX, dy = e.pageY - startY;
  if (Date.now() - startTime <= 1000 && Math.abs(dx) >= 30 && Math.abs(dy) < 20){
    fire('shiftEntry', dx < 0 ? 1 : -1);
  }
}

export default function(el) {
  el.addEventListener('touchstart', start);
  el.addEventListener('touchend', end);
}
