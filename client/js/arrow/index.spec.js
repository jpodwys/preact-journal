import arrow from './index';
import { Provider } from '../../components/unifire';

describe('arrow', () => {
  const LEFT = 37;
  const RIGHT = 39;
  const ENTER = 13;
  const SPACE = 19;
  const ID = 'bogus-id';
  let provider;
  let shiftEntry;

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

  it('should do nothing when the key pressed is not left or right', (done) => {
    emit(ENTER);
    emit(SPACE);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is an input', (done) => {
    appendAndFocus('input');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement is a textarea', (done) => {
    appendAndFocus('textarea');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should do nothing when document.activeElement has the contenteditable attribute', (done) => {
    appendAndFocus('div', 'contentEditable');
    emit(LEFT);
    emit(RIGHT);
    setTimeout(() => {
      expect(shiftEntry.called).to.be.false;
      done();
    });
  });

  it('should fire shiftEntry with -1 when left is pressed', (done) => {
    appendAndFocus('div');
    emit(LEFT);
    setTimeout(() => {
      expect(shiftEntry.calledWithExactly(provider, -1, undefined)).to.be.true;
      done();
    });
  });

  it('should fire shiftEntry with 1 when right is pressed', (done) => {
    appendAndFocus('div');
    emit(RIGHT);
    setTimeout(() => {
      expect(shiftEntry.calledWithExactly(provider, 1, undefined)).to.be.true;
      done();
    });
  });

});
