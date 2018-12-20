import arrow from './index';

describe('arrow', () => {
  const LEFT = 37;
  const RIGHT = 39;
  const ENTER = 13;
  const SPACE = 19;
  const ID = 'bogus-id';
  let handler;
  let cb;

  function appendAndFocus(type, attr) {
    const el = document.createElement(type);
    el.id = ID;
    if(attr) el[attr] = true;
    document.body.appendChild(el).focus();
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
    handler = (e) => { cb(e.detail[1]); };
    document.addEventListener('UNIFIRE', handler);
  });

  afterEach(() => {
    removeEl();
    document.removeEventListener('UNIFIRE', handler);
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
      expect(cb.calledWithExactly(-1)).to.be.true;
      done();
    });
  });

  it('should fire shiftEntry with 1 when right is pressed', (done) => {
    appendAndFocus('div');
    emit(RIGHT);
    setTimeout(() => {
      expect(cb.called).to.be.true;
      expect(cb.calledWithExactly(1)).to.be.true;
      done();
    });
  });
    
});
