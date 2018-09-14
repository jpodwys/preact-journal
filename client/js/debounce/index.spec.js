import debounce from './index';

describe('debounce', () => {
  let cb;

  beforeEach(() => {
    cb = sinon.spy();
  });

  afterEach(() => {
    cb.resetHistory();
  });

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

  it('should wait the passed delay to execute the passed callback', (done) => {
    debounce(cb, 10)();
    setTimeout(() => {
      expect(cb.calledOnce).to.be.false;
      setTimeout(() => {
        expect(cb.calledOnce).to.be.true;
        done();
      }, 10)
    });
  });
  
});
