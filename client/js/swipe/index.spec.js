import swipe from './index';
import { Provider } from '../../components/unifire';

describe('swipe', () => {
  const ID = 'bogus-id';
  let provider;
  let shiftEntry;

  function appendAndFocus(type, attr) {
    const el = document.createElement(type);
    el.id = ID;
    if(attr) el[attr] = true;
    document.body.appendChild(el);
    document.getElementById(ID).focus();
  };

  function removeEl() {
    const el = document.getElementById(ID);
    if(el) el.remove();
  };

  function emit(name, x, y) {
    let e = new Event(name);
    e.pageX = x;
    e.pageY = y;
    document.dispatchEvent(e);
  };

  before(() => {
    swipe(document);
  });

  beforeEach(() => {
    shiftEntry = sinon.spy();
    provider = new Provider({
      state: { loggedIn: true },
      actions: { shiftEntry },
      children: []
    });
  });

  afterEach(() => {
    removeEl();
  });

  it('should do nothing when the swipe\'s x distance is below 30px', (done) => {
    emit('touchstart', 0, 0);
    emit('touchend', 29, 0);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when the swipe\'s y distance is above 20px', (done) => {
    emit('touchstart', 0, 0);
    emit('touchend', 30, 21);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is an input', (done) => {
    appendAndFocus('input');
    emit('touchstart', 0, 0);
    emit('touchend', 30, 21);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is a textarea', (done) => {
    appendAndFocus('textarea');
    emit('touchstart', 0, 0);
    emit('touchend', 30, 21);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement has the contenteditable attribute', (done) => {
    appendAndFocus('div', 'contentEditable');
    emit('touchstart', 0, 0);
    emit('touchend', 30, 21);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when the swipe ends >= 1000ms after starting', (done) => {
    emit('touchstart', 0, 0);
    setTimeout(() => {
      emit('touchend', 30, 0);
      setTimeout(() => {
        expect(shiftEntry.called).to.be.false;
        done();
      });
    }, 1010); // This test occasionally fails with exactly 1000ms as the timeout
  });

  it('should fire `shiftEntry` with -1 when swiping to the right', (done) => {
    emit('touchstart', 0, 0);
    setTimeout(() => {
      emit('touchend', 30, 19);
      setTimeout(() => {
        expect(shiftEntry.calledWithExactly(provider, -1, undefined)).to.be.true;
        done();
      });
    }, 100);
  });

  it('should fire `shiftEntry` with 1 when swiping to the left', (done) => {
    emit('touchstart', 30, 0);
    setTimeout(() => {
      emit('touchend', 0, 19);
      setTimeout(() => {
        expect(shiftEntry.calledWithExactly(provider, 1, undefined)).to.be.true;
        done();
      });
    }, 100);
  });
});
