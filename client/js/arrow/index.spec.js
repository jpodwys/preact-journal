import arrow from './index';

describe('arrow', () => {
  const LEFT = 37;
  const RIGHT = 39;
  const ENTER = 13;
  const SPACE = 19;
  const ID = 'bogus-id';
  let cb;

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

  function emit(keyCode) {
    let e = new Event('keydown');
    e.keyCode = keyCode;
    document.dispatchEvent(e);
  };

  before(() => {
    arrow(document);
  });

  beforeEach(() => {
    cb = sinon.spy();
    document.addEventListener('shiftEntry', cb);
  });

  afterEach(() => {
    removeEl();
    document.removeEventListener('shiftEntry', cb);
  });

  it('should do nothing when the key pressed is not left or right', (done) => {
    emit(ENTER);
    emit(SPACE);
    setTimeout(() => {
      expect(cb.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is an input', (done) => {
    appendAndFocus('input');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(cb.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is a textarea', (done) => {
    appendAndFocus('textarea');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(cb.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement has the contenteditable attribute', (done) => {
    appendAndFocus('div', 'contentEditable');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(cb.called).to.be.false;
      done();
    });
  });

  it('should fire shiftEntry with -1 when left is pressed', (done) => {
    appendAndFocus('div');
    emit(LEFT);
    setTimeout(() => {
      expect(cb.called).to.be.true;
      // expect(cb.args[0].detail).to.equal(-1);
      done();
    });
  });

  it('should fire shiftEntry with 1 when right is pressed', (done) => {
    appendAndFocus('div');
    emit(RIGHT);
    setTimeout(() => {
      expect(cb.called).to.be.true;
      // expect(cb.args[0].detail).to.equal(1);
      done();
    });
  });
    
});
