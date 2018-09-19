import fetchMock from 'fetch-mock';
import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
  
describe('actions', () => {
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

  afterEach(() => {

  });

  describe('globalActions', () => {

    describe('linkstate', () => {

      it('should call set on the provided el mock with the correct params', () => {
        const cb = function(){};
        const delta = { key: 'bogus', val: 'value', cb: cb };
        Global.linkstate(el, delta);
        expect(el.set.args[0][0][delta.key]).to.equal(delta.val);
      });

    });

  });

  describe('userActions', () => {
    const USER = { username: 'bogus', password: 'value' };

    beforeEach(() => {
      sinon.spy(console, 'log');
    });

    afterEach(() => {
      fetchMock.restore();
      console.log.restore();
    });

    describe('login', () => {

      it('should clear localStorage, login, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.login(el, USER);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      it('should clear localStorage and log an error', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 400 }));
        localStorage.setItem('bogus', 'value');
        User.login(el, USER);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.called).to.be.false;
          expect(console.log.calledWith('loginFailure')).to.be.true;
          done();
        });
      });

    });

    describe('create', () => {

      it('should clear localStorage, create account, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope', (done) => {
        fetchMock.post('/api/user', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.createAccount(el, USER);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      it('should clear localStorage and log an error', (done) => {
        fetchMock.post('/api/user', Promise.resolve({ status: 400 }));
        localStorage.setItem('bogus', 'value');
        User.createAccount(el, USER);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.called).to.be.false;
          expect(console.log.calledWith('createAccountFailure')).to.be.true;
          done();
        });
      });

    });

    describe('logout', () => {

      it('should clear localStorage, reset state, and route back to / (the login page)', (done) => {
        fetchMock.post('/api/user/logout', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.logout(el);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.state.bogus).to.be.undefined;
          done();
        });
      });

      it('should not clear localStorage and should log an error', (done) => {
        fetchMock.post('/api/user/logout', Promise.resolve({ status: 400 }));
        localStorage.setItem('bogus', 'value');
        User.logout(el);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.equal('value');
          expect(el.set.called).to.be.false;
          expect(console.log.calledWith('logoutFailure')).to.be.true;
          done();
        });
      });

    });

  });

  describe('entryActions', () => {

    // getEntries,
    // createEntry,
    // updateEntry,
    // deleteEntry,
    // setEntry,
    // newEntry,
    // filterByText,
    // blurTextFilter,
    // shiftEntry

    describe('setEntry', () => {

      it('should do nothing when there is no id or id is -1', () => {
        Entry.setEntry(el, {});
        expect(el.set.called).to.be.false;

        Entry.setEntry(el, { id: -1 });
        expect(el.set.called).to.be.false;
      });

      it('should find an entry in el.state.entries when view is /new', () => {
        el.state.view = '/new';
        el.state.entries = [ { id: 0 }, { id: 1 } ];
        el.state.viewEntries = [ { id: 2 }, { id: 3 } ];

        Entry.setEntry(el, { id: '0' });
        const entry = el.set.args[0][0].entry;
        const entryIndex = el.set.args[0][0].entryIndex;
        expect(entry).to.equal(el.state.entries[0]);
        expect(entryIndex).to.equal(0);
      });

      it('should find an entry in el.state.viewEntries when view is not /new', () => {
        el.state.view = '/entries';
        el.state.entries = [ { id: 0 }, { id: 1 } ];
        el.state.viewEntries = [ { id: 2 }, { id: 3 } ];

        Entry.setEntry(el, { id: '3' });
        const entry = el.set.args[0][0].entry;
        const entryIndex = el.set.args[0][0].entryIndex;
        expect(entry).to.equal(el.state.viewEntries[1]);
        expect(entryIndex).to.equal(1);
      });

    });

    describe('newEntry', () => {

      it('should set entry and entries while also passing a cb', () => {
        Entry.newEntry(el);
        const entry = el.set.args[0][0].entry;
        const entries = el.set.args[0][0].entries;
        expect(entry).to.exist;
        expect(entries[0]).to.equal(entry);
        expect(typeof el.set.args[0][1]).to.equal('function');
      });

    });

    describe('filterByText', () => {

      it('should set filterText when appropriate', () => {
        el.state.filterText = 'bogus';

        Entry.filterByText(el);
        expect(el.set.called).to.be.false;

        Entry.filterByText(el, undefined, {});
        expect(el.set.called).to.be.false;

        Entry.filterByText(el, 'bogus');
        expect(el.set.called).to.be.false;

        Entry.filterByText(el, undefined, { target: { value: 'bogus' } });
        expect(el.set.called).to.be.false;

        Entry.filterByText(el, 'one');
        expect(el.set.args[0][0].filterText).to.equal('one');

        Entry.filterByText(el, undefined, { target: { value: 'two' } });
        expect(el.set.args[1][0].filterText).to.equal('two');
      });

    });

    describe('blurTextFilter', () => {

      it('should set showFilterInput to false when there is no filter text', () => {
        el.state.filterText = 'bogus';
        Entry.blurTextFilter(el);
        expect(el.set.called).to.be.false;

        el.state.filterText = '';
        Entry.blurTextFilter(el);
        expect(el.set.args[0][0].showFilterInput).to.be.false;
      });

    });

    // Can't really test this as currently written. I don't think spying on route will work here.
    // describe('shiftEntry', () => {

    //   it('should route to the next or prior entry when appropriate', () => {
        
    //   });

    // });

  });

});
