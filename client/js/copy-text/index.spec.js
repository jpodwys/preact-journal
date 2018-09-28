import copyText from './index';
  
describe('copyText', () => {

  it('should fire linkstate', (done) => {
    const cb = sinon.spy();
    document.execCommand = () => true;
    document.addEventListener('linkstate', cb);
    copyText('bogus');
    setTimeout(() => {
      expect(cb.called).to.be.true;
      done();
    });
  });

  it('should use the share API when available', () => {
    navigator.share = sinon.spy();
    copyText('bogus');
    expect(navigator.share.args[0][0].text).to.equal('bogus');
  });
  
});
