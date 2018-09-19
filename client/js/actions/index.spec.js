import fetchMock from 'fetch-mock';
import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
  
describe('actions', () => {
  let el;

  function getElStub() {
    return {
      state: { bogus: 'value' },
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

    afterEach(() => {
      fetchMock.restore();
    });

    describe('login', () => {

      it('should clear localStorage, login, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.login(el, { username: 'bogus', password: 'value' });
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.called).to.be.true;
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      // it('should fail login when...', (done) => {

      // });

    });

    describe('create', () => {

      it('should clear localStorage, create account, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope', (done) => {
        fetchMock.post('/api/user', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.createAccount(el, { username: 'bogus', password: 'value' });
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.called).to.be.true;
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      // it('should fail login when...', (done) => {

      // });

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

      // it('should fail login when...', (done) => {

      // });

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

  });

});
