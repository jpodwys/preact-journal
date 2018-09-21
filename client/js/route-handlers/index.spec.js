import handleRouteChange from './index';
  
describe('routeHandlers', () => {
  let el;

  function getElStub() {
    return {
      state: { entries: [], bogus: 'value' },
      set: sinon.spy()
    };
  };

  beforeEach(() => {
    el = getElStub();
  });

  it('should set view when appropriate', () => {
    handleRouteChange.call(el, '/entries');
    expect(el.set.called).to.be.false;

    handleRouteChange.call(el, '/');
    expect(el.set.args[0][0].view).to.equal('/');
  });

  /* Can't currently test whether route was called. I'll look more into this later. */

  // it('should route back to / when passed an unkown path', () => {
  //   handleRouteChange.call(el, '/bogus');
  //   expect(el.set.args[0][0].view).to.equal('/');
  // });

  // it('should route back to / while logged out', () => {
  //   handleRouteChange.call(el, '/entries');
  //   expect(el.set.args[0][0].view).to.equal('/');
  // });

  // it('should route to /entries when visiting / while logged in', () => {
  //   handleRouteChange.call(el, '/entries');
  //   expect(el.set.args[0][0].view).to.equal('/');
  // });

  it('should reset toastConfig if it is set', (done) => {
    const cb = sinon.spy();
    const handler = (e) => { cb(e.detail[0]); };
    document.addEventListener('linkstate', handler);
    el.state.toastConfig = {};
    handleRouteChange.call(el, '/');
    setTimeout(() => {
      const detail = cb.args[0][0];
      expect(detail.key).to.equal('toastConfig');
      expect(detail.val).to.be.undefined;
      document.removeEventListener('linkstate', handler);
      done();
    });
  });

  it('should remove first entry from entries when appropriate when going to /entries', () => {
    el.state.loggedIn = true;

    el.state.entries = undefined;
    handleRouteChange.call(el, '/entries');
    // set was already called once at this point
    expect(el.set.calledTwice).to.be.false;

    el.state.entries = [ { text: 'hi' } ];
    handleRouteChange.call(el, '/entries');
    // set was already called twice at this point
    expect(el.set.calledThrice).to.be.false;

    el.state.entries = [ { newEntry: true, text: '' } ];
    handleRouteChange.call(el, '/entries');
    // set was already called thrice at this point
    const args = el.set.args[3][0];
    expect(args.entries.length).to.equal(0);
  });

  it('should fire newEntry on /new', (done) => {
    const cb = sinon.spy();
    document.addEventListener('newEntry', cb);

    el.state.loggedIn = true;
    handleRouteChange.call(el, '/entry/new');

    setTimeout(() => {
      expect(cb.called).to.be.true
      document.removeEventListener('newEntry', cb);
      done();
    });
  });

  it('should fire setEntry on /entry/:id', (done) => {
    const cb = sinon.spy();
    const handler = (e) => { cb(e.detail[0]); };
    document.addEventListener('setEntry', handler);

    el.state.loggedIn = true;
    handleRouteChange.call(el, '/entry/10');

    setTimeout(() => {
      const args = cb.args[0][0];
      expect(args.id).to.equal('10');
      document.removeEventListener('newEntry', handler);
      done();
    });
  }); 
});
