import copyText from './index';
  
describe('copyText', () => {

  it('should fire linkstate', (done) => {
    const cb = sinon.spy();
    const handler = (e) => {
      if(e.detail[0] === 'linkstate'){
        cb(e.detail);
      }
    };
    document.execCommand = () => true;
    document.addEventListener('UNIFIRE', handler);
    copyText('bogus');
    setTimeout(() => {
      expect(cb.called).to.be.true;
      const args = cb.args[0][0];
      expect(args[0]).to.equal('linkstate');
      expect(args[1].key).to.equal('toastConfig');
      expect(args[1].val.type).to.equal('text copied');
      document.addEventListener('UNIFIRE', handler);
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
