import { listen } from '../../packages/kyvo/helpers';
import { shiftEntry } from '../actions/entry-actions';

const typing = () => {
  const el = document.activeElement;
  return el && el.matches('input,textarea,[contenteditable]');
};

// Left/right arrow keys and horizontal swipes step between entries, never while typing.
// Call it unconditionally in a component body; the listeners come off when it unmounts.
// Swipe adapted from here: http://codepen.io/yzubizarreta/pen/ojJBQp
export default function shortcuts (ctx) {
  let x, y, time;           // where and when the touch started
  const point = e => e.changedTouches ? e.changedTouches[0] : e;

  listen(ctx, document, 'keydown', e => {
    if((e.keyCode === 37 || e.keyCode === 39) && !typing()) shiftEntry(e.keyCode === 37 ? -1 : 1);
  });
  listen(ctx, document, 'touchstart', e => {
    ({ pageX: x, pageY: y } = point(e));
    time = Date.now();
  });
  listen(ctx, document, 'touchend', e => {
    if(typing()) return;
    const { pageX, pageY } = point(e), dx = pageX - x, dy = pageY - y;
    if(Date.now() - time <= 1000 && Math.abs(dx) >= 30 && Math.abs(dy) < 20) shiftEntry(dx < 0 ? 1 : -1);
  });
}
