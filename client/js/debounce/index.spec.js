import debounce from './index';

describe('debounce', () => {
  const cb = sinon.spy();

  it('should return a function', () => {
    expect(typeof debounce()).to.equal('function');
  });

  it('should execute the passed callback', (done) => {
    debounce(cb)();
    setTimeout(() => {
      expect(cb.calledOnce).to.be.true;
      done();
    });
  });
  
});
