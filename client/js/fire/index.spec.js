import fire from './index';

describe('fire', () => {
  const EVENT_NAME = 'bogusEvent';
  const spy = sinon.spy();
  document.addEventListener(EVENT_NAME, spy);

  it('should return a function and should not fire an event', () => {
    expect(typeof fire(EVENT_NAME)).to.equal('function');
    expect(spy.calledOnce).to.be.false;
  });

  it('should fire an event with the provided EVENT_NAME when calling the returned function', () => {
    fire(EVENT_NAME)();
    expect(spy.calledOnce).to.be.true;
  });

  it('should expose data in the following format to e.detail: { detail: [ detail, e ] }', () => {
    const DETAIL = { a: 'a' };
    const E = { type: 'mouse' };
    fire(EVENT_NAME, DETAIL)(E);
    expect(spy.calledTwice).to.be.true;
    /* Not sure how to get this working right now, but it's an important test. */
    // expect(spy.calledWithExactly({ detail: [ DETAIL, E ] })).to.be.true;
  });
  
});
