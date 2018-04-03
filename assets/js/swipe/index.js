import fire from '../fire';

// http://codepen.io/yzubizarreta/pen/ojJBQp
var touchStartCoords =  {'x':-1, 'y':-1}, // X and Y coordinates on mousedown or touchstart events.
    touchEndCoords = {'x':-1, 'y':-1},// X and Y coordinates on mouseup or touchend events.
    direction = 'undefined',// Swipe direction
    minDistanceXAxis = 30,// Min distance on mousemove or touchmove on the X axis
    maxDistanceYAxis = 20,// Max distance on mousemove or touchmove on the Y axis
    maxAllowedTime = 1000,// Max allowed time between swipeStart and swipeEnd
    startTime = 0,// Time on swipeStart
    elapsedTime = 0;// Elapsed time between swipeStart and swipeEnd
    // targetElement = document.body;// Element to delegate

exports.swipeStart = function(e) {
  e = e ? e : window.event;
  e = ('changedTouches' in e)?e.changedTouches[0] : e;
  touchStartCoords = {'x':e.pageX, 'y':e.pageY};
  startTime = new Date().getTime();
}

// exports.swipeMove = function(e) {
//   e = e ? e : window.event;
//   // e.preventDefault();
// }

exports.swipeEnd = function(e) {
  let el = document.activeElement;
  if(el && el.matches('input') || el.matches('textarea') || el.hasAttribute('contenteditable')) return;
  e = e ? e : window.event;
  e = ('changedTouches' in e)?e.changedTouches[0] : e;
  touchEndCoords = {'x':e.pageX - touchStartCoords.x, 'y':e.pageY - touchStartCoords.y};
  elapsedTime = new Date().getTime() - startTime;
  if (elapsedTime <= maxAllowedTime){
    if (Math.abs(touchEndCoords.x) >= minDistanceXAxis && Math.abs(touchEndCoords.y) <= maxDistanceYAxis){
      direction = (touchEndCoords.x < 0) ? 'left' : 'right';
      switch(direction){
        case 'left':
          fire('shiftEntry', 1)();
          break;
        case 'right':
          fire('shiftEntry', -1)();
          break;
      }
    }
  }
}

exports.listen = function(el, s, fn) {
  var evts = s.split(' ');
  for (var i=0, iLen=evts.length; i<iLen; i++) {
    el.addEventListener(evts[i], fn, false);
  }
}
