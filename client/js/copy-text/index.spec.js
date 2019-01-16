import copyText from './index';

describe('copyText', () => {

  it('should fire setToast', (done) => {
    const NAME = 'UNIFIRE';
    const cb = sinon.spy();
    const handler = (e) => {
      if(e.detail[0] === 'setToast'){
        cb(e.detail);
      }
    };
    document.execCommand = () => true;
    document.addEventListener(NAME, handler);
    copyText('bogus');
    setTimeout(() => {
      expect(cb.called).to.be.true;
      const args = cb.args[0][0];
      expect(args[0]).to.equal('setToast');
      document.addEventListener(NAME, handler);
      done();
    });
  });

  it('should use the share API when available', () => {
    navigator.share = sinon.spy();
    copyText('bogus');
    setTimeout(() => {
      expect(navigator.share.args[0][0].text).to.equal('bogus');
    });
  });

});
