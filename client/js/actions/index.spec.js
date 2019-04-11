import fetchMock from 'fetch-mock';
import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';

describe('actions', () => {
  const NAME = 'UNIFIRE';
  let el;

  function getElStub() {
    return {
      state: { entries: [], showFilterInput: false },
      set: sinon.spy(),
      reset () {
        this.state = { entries: [] };
      }
    };
  };

  beforeEach(() => {
    el = getElStub();
    sinon.spy(console, 'log');
  });

  afterEach(() => {
    fetchMock.restore();
    console.log.restore();
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

    describe('handleRouteChange', () => {

      /* Can't currently test whether route was called. Unfortunately falling back to wrapping the history API. */

      // let pushStateCall;
      let replaceStateCall;

      const { pushState, replaceState } = history;
      // history.pushState = (a, b, url) => {
      //   pushState.call(history, a, b, url);
      //   pushStateCall = url;
      // };
      history.replaceState = (a, b, url) => {
        replaceState.call(history, a, b, url);
        replaceStateCall = url;
      };

      afterEach(() => {
        // pushStateCall = undefined;
        replaceStateCall = undefined;
      });

      after(() => {
        // history.pushState = pushState;
        history.replaceState = replaceState;
      });

      it('should set view when appropriate', () => {
        Global.handleRouteChange(el, null, '/entries');
        expect(el.set.called).to.be.false;

        Global.handleRouteChange(el, null, '/');
        expect(el.set.args[0][0].view).to.equal('/');
      });

      it('should route back to / when passed an unkown path', (done) => {
        el.state.loggedIn = true;
        Global.handleRouteChange(el, null, '/bogus');
        setTimeout(() => {
          expect(replaceStateCall).to.equal('/');
          done();
        });
      });

      it('should route back to / while logged out', (done) => {
        Global.handleRouteChange(el, null, '/entries');
        setTimeout(() => {
          expect(replaceStateCall).to.equal('/');
          done();
        });
      });

      it('should route to /entries when visiting / while logged in', (done) => {
        el.state.loggedIn = true;
        Global.handleRouteChange(el, null, '/');
        setTimeout(() => {
          expect(replaceStateCall).to.equal('/entries');
          done();
        });
      });

      /* This test may become useful in the future if I change how toast works, but it's not useful with my latest changes. */

      // it('should reset toastConfig if it is set', (done) => {
      //   const cb = sinon.spy();
      //   const handler = (e) => {
      //     if(e.detail[0] === 'linkstate'){
      //       cb(e.detail[1]);
      //     }
      //   };
      //   document.addEventListener(NAME, handler);
      //   el.state.toastConfig = {};
      //   Global.handleRouteChange(el, null, '/');
      //   setTimeout(() => {
      //     const detail = cb.args[0][0];
      //     expect(detail.key).to.equal('toastConfig');
      //     expect(detail.val).to.be.undefined;
      //     document.removeEventListener(NAME, handler);
      //     done();
      //   });
      // });

      it('should remove first entry from entries when appropriate when going to /entries', () => {
        el.state.loggedIn = true;

        el.state.entries = undefined;
        Global.handleRouteChange(el, null, '/entries');
        // set was already called once at this point
        expect(el.set.calledTwice).to.be.false;

        el.state.entries = [ { text: 'hi' } ];
        Global.handleRouteChange(el, null, '/entries');
        // set was already called twice at this point
        expect(el.set.calledThrice).to.be.false;

        el.state.entries = [ { newEntry: true, text: '' } ];
        Global.handleRouteChange(el, null, '/entries');
        // set was already called thrice at this point
        const args = el.set.args[3][0];
        expect(args.entries.length).to.equal(0);
      });

      it('should fire newEntry on /new', (done) => {
        const cb = sinon.spy();
        document.addEventListener(NAME, cb);

        el.state.loggedIn = true;
        Global.handleRouteChange(el, null, '/entry/new');

        setTimeout(() => {
          expect(cb.called).to.be.true
          document.removeEventListener(NAME, cb);
          done();
        });
      });

      it('should fire setEntry on /entry/:id', (done) => {
        const cb = sinon.spy();
        const handler = (e) => {
          if(e.detail[0] === 'setEntry'){
            cb(e.detail[1]);
          }
        };
        document.addEventListener(NAME, handler);

        el.state.loggedIn = true;
        Global.handleRouteChange(el, null, '/entry/10');

        setTimeout(() => {
          const args = cb.args[0][0];
          expect(args.id).to.equal('10');
          document.removeEventListener(NAME, handler);
          done();
        });
      });

    });

  });

  describe('userActions', () => {
    const USER = { username: 'bogus', password: 'value' };

    describe('login', () => {

      it('should login, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope)', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 204 }));
        User.login(el, USER);
        setTimeout(() => {
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      it('should log an error', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 400 }));
        User.login(el, USER);
        setTimeout(() => {
          expect(el.set.called).to.be.false;
          expect(console.log.calledWith('loginFailure')).to.be.true;
          done();
        });
      });

    });

    describe('create', () => {

      it('should create account, and provide a callback to .set (which routes to /entries, but testing that is beyond this test\'s scope)', (done) => {
        fetchMock.post('/api/user', Promise.resolve({ status: 204 }));
        User.createAccount(el, USER);
        setTimeout(() => {
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

      it('should log an error', (done) => {
        fetchMock.post('/api/user', Promise.resolve({ status: 400 }));
        User.createAccount(el, USER);
        setTimeout(() => {
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
        el.state.showFilterInput = true;
        User.logout(el);
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.calledOnce).to.be.true;
          expect(el.set.args[0][0].showFilterInput).to.be.false;
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

    describe('boot', () => {

      it('should set entries', () => {
        const entries = [];
        Entry.boot(el, { entries });
        const arg = el.set.args[0][0];
        expect(arg.entries).to.equal(entries);
      });

      // it('should call get entries in a callback', () => {

      // });

      // it('should run handleRouteChange when state.view === "/entry"', () => {

      // });

    });

    describe('getEntries', () => {

      beforeEach(() => {
        // This resets the private dataFetched variable inside of entry-actions
        el.state.loggedIn = false;
        Entry.getEntries(el);
      });

      it('should do nothing while logged out', () => {
        el.state.loggedIn = false;
        Entry.getEntries(el);
        expect(el.set.called).to.be.false;
      });

      it('should do nothing while logged in if el.state.entries is defined', () => {
        el.state.loggedIn = true;
        Entry.getEntries(el);
        expect(el.set.called).to.be.false;
      });

      it('should do nothing on the second call (when the private dataFetched variable is true)', (done) => {
        el.state.loggedIn = true;
        Entry.getEntries(el);
        setTimeout(() => {
          Entry.getEntries(el);
          setTimeout(() => {
            expect(el.set.called).to.be.false;
            done();
          });
        });
      });

      it('should fetch entries and timestamp when timestamp is undefined', (done) => {
        fetchMock.get('/api/entries', {
          status: 200,
          body: {
            entries: [ { id: 0, date: '2018-01-01', text: 'bogus' } ],
            timestamp: 1234
          }
        });

        el.state.entries = [];
        el.state.loggedIn = true;
        Entry.getEntries(el);
        setTimeout(() => {
          const arg = el.set.args[0][0];
          expect(arg.entries[0].id).to.equal(0);
          expect(arg.timestamp).to.equal(1234);
          done();
        });
      });

      it('should handle an error when fetching entries and timestamp when timestamp is undefined', (done) => {
        fetchMock.get('/api/entries', 500);

        delete el.state.entries;
        el.state.loggedIn = true;
        Entry.getEntries(el);
        setTimeout(() => {
          expect(console.log.calledWith('getAllEntriesError')).to.be.true;
          done();
        });
      });

      it('should sync entries from the server to the cleint when there is a timestamp', (done) => {
        fetchMock.get('/api/entries/sync/1234', {
          status: 200,
          body: {
            entries: [ { id: 0, deleted: 1 }, { id: 1, date: '2018-01-01' }, { id: 2, date: '2017-01-01' } ],
            timestamp: 4321
          }
        });

        el.state.loggedIn = true;
        el.state.timestamp = 1234;
        el.state.entries = [ { id: 0 }, { id: 1 } ];
        Entry.getEntries(el);
        setTimeout(() => {
          const arg = el.set.args[0][0];
          expect(arg.entries[0].id).to.equal(2);
          expect(arg.entries[0].date).to.equal('2017-01-01');
          expect(arg.entries[1].id).to.equal(1);
          expect(arg.entries[1].date).to.equal('2018-01-01');
          expect(arg.timestamp).to.equal(4321);
          done();
        });
      });

      it('should set timestamp to localStorage without calling el.set when the sync response contains no entries', (done) => {
        fetchMock.get('/api/entries/sync/1234', {
          status: 200,
          body: {
            entries: [],
            timestamp: 4321
          }
        });

        el.state.loggedIn = true;
        el.state.timestamp = 1234;
        localStorage.setItem('timestamp', 1234);
        Entry.getEntries(el);
        setTimeout(() => {
          expect(el.set.called).to.be.false;
          expect(localStorage.getItem('timestamp')).to.equal('4321');
          done();
        });
      });

      it('should handle an error when syncing entries', (done) => {
        fetchMock.get('/api/entries/sync/1234', 500);

        el.state.loggedIn = true;
        el.state.timestamp = 1234;
        Entry.getEntries(el);
        setTimeout(() => {
          expect(console.log.calledWith('syncEntriesFailure')).to.be.true;
          done();
        });
      });

      it('should sync entries from the client to the server when one or more entries has the needsSync flag', (done) => {
        fetchMock.get('/api/entries/sync/1234', {
          status: 200,
          body: {
            entries: [],
            timestamp: 4321
          }
        });
        fetchMock.post('/api/entry', {
          status: 200,
          body: { id: 3 }
        });
        fetchMock.patch('/api/entry/1', 204);
        fetchMock.delete('/api/entry/2', 204);

        el.state.loggedIn = true;
        el.state.timestamp = 1234;
        el.state.entries = [
          { id: 0, date: '2018-01-01', text: 'bogus', newEntry: true, needsSync: true  },
          { id: 1, date: '2017-01-01', text: 'what', needsSync: true },
          { id: 2, deleted: true, needsSync: true },
        ];
        Entry.getEntries(el);
        setTimeout(() => {
          const entries = el.state.entries;
          expect(entries.length).to.equal(2);
          expect(entries[0].id).to.equal(3);
          expect(entries[0].newEntry).to.be.undefined;
          expect(entries[0].needsSync).to.be.undefined;
          expect(entries[1].needsSync).to.be.undefined;
          done();
        });
      });

      it('should handle a failure to update an entry from client to server', (done) => {
        fetchMock.get('/api/entries/sync/1234', {
          status: 200,
          body: {
            entries: [],
            timestamp: 4321
          }
        });
        fetchMock.patch('/api/entry/0', 500);

        el.state.loggedIn = true;
        el.state.timestamp = 1234;
        el.state.entries = [ { id: 0, date: '2017-01-01', text: 'what', needsSync: true } ];
        Entry.getEntries(el);
        setTimeout(() => {
          expect(console.log.calledWith('updateEntryFailure')).to.be.true;
          done();
        });
      });

    });

    describe('createEntry', () => {
      let entry;
      let postPendingEntry;

      beforeEach(() => {
        entry = { id: 0, date: '2018-01-01', text: '', needsSync: true, newEntry: true };
        postPendingEntry = { id: 0, date: '2018-01-01', text: '', needsSync: true, newEntry: true, postPending: true };
        el.state.entry = entry;
        el.state.entries.push(entry);
      });

      it('should do nothing when entry is missing, or entry.id is missing or is not a number, or the provided id is not found', () => {
        Entry.createEntry(el, {});
        expect(el.set.called).to.be.false;

        Entry.createEntry(el, { entry: {} });
        expect(el.set.called).to.be.false;

        Entry.createEntry(el, { entry: { id: '0' } });
        expect(el.set.called).to.be.false;

        Entry.createEntry(el, { entry: { id: 1 } });
        expect(el.set.called).to.be.false;
      });

      it('should call set only once (with the correct params, of course) and make no network call if !clientSync && postPending', (done) => {
        el.state.entry = postPendingEntry;
        Entry.createEntry(el, { entry: postPendingEntry });

        const arg = el.set.args[0][0];
        expect(arg.entry).to.equal(postPendingEntry);
        expect(arg.entries[0].postPending).to.be.true;

        setTimeout(() => {
          expect(el.set.calledTwice).to.be.false;
          expect()
          done();
        });
      });

      it('should call set twice (with the correct params, of course) and set postPending to true if !postPending', (done) => {
        fetchMock.post('/api/entry', {
          status: 200,
          body: { id: 1 }
        });
        Entry.createEntry(el, { entry: entry });

        const firstCallArg = el.set.args[0][0];
        expect(firstCallArg.entry).to.equal(entry);
        expect(firstCallArg.entries[0].postPending).to.be.true;

        setTimeout(() => {
          const secondCallArg = el.set.args[1][0];
          expect(secondCallArg.entry.id).to.equal(1);
          expect(secondCallArg.entry.postPending).to.be.undefined;
          expect(secondCallArg.entry.newEntry).to.be.undefined;
          expect(secondCallArg.entry.needsSync).to.be.undefined;
          expect(secondCallArg.entries[0].id).to.equal(1);
          expect(secondCallArg.entries[0].postPending).to.be.undefined;
          expect(secondCallArg.entries[0].newEntry).to.be.undefined;
          expect(secondCallArg.entries[0].needsSync).to.be.undefined;
          done();
        });
      });

      it('should call set twice (with the correct params, of course) and set postPending to true if clientSync is true even when postPending is true', (done) => {
        fetchMock.post('/api/entry', {
          status: 200,
          body: { id: 1 }
        });
        el.state.entry = postPendingEntry;
        Entry.createEntry(el, { entry: postPendingEntry, clientSync: true });

        const firstCallArg = el.set.args[0][0];
        expect(firstCallArg.entry).to.equal(postPendingEntry);
        expect(firstCallArg.entries[0].postPending).to.be.true;

        setTimeout(() => {
          const secondCallArg = el.set.args[1][0];
          expect(secondCallArg.entry.id).to.equal(1);
          expect(secondCallArg.entry.postPending).to.be.undefined;
          expect(secondCallArg.entry.newEntry).to.be.undefined;
          expect(secondCallArg.entry.needsSync).to.be.undefined;
          expect(secondCallArg.entries[0].id).to.equal(1);
          expect(secondCallArg.entries[0].postPending).to.be.undefined;
          expect(secondCallArg.entries[0].newEntry).to.be.undefined;
          expect(secondCallArg.entries[0].needsSync).to.be.undefined;
          done();
        });
      });

      it('should call set twice (with the correct params, of course) and set postPending to true if !postPending', (done) => {
        fetchMock.post('/api/entry', {
          status: 200,
          body: { id: 1 }
        });
        Entry.createEntry(el, { entry: entry });

        const firstCallArg = el.set.args[0][0];
        expect(firstCallArg.entry).to.equal(entry);
        expect(firstCallArg.entries[0].postPending).to.be.true;

        setTimeout(() => {
          const secondCallArg = el.set.args[1][0];
          expect(secondCallArg.entry.id).to.equal(1);
          expect(secondCallArg.entry.postPending).to.be.undefined;
          expect(secondCallArg.entry.newEntry).to.be.undefined;
          expect(secondCallArg.entry.needsSync).to.be.undefined;
          expect(secondCallArg.entries[0].id).to.equal(1);
          expect(secondCallArg.entries[0].postPending).to.be.undefined;
          expect(secondCallArg.entries[0].newEntry).to.be.undefined;
          expect(secondCallArg.entries[0].needsSync).to.be.undefined;
          done();
        });
      });

      it('should handle a network call failure correctly', (done) => {
        fetchMock.post('/api/entry', 500);
        Entry.createEntry(el, { entry: entry });

        const firstCallArg = el.set.args[0][0];
        expect(firstCallArg.entry).to.equal(entry);
        expect(firstCallArg.entries[0].postPending).to.be.true;

        setTimeout(() => {
          const secondCallArg = el.set.args[1][0];
          expect(secondCallArg.entry.id).to.equal(0);
          expect(secondCallArg.entry.postPending).to.be.undefined;
          expect(secondCallArg.entry.newEntry).to.be.true;
          expect(secondCallArg.entry.needsSync).to.be.true;
          expect(secondCallArg.entries[0].id).to.equal(0);
          expect(secondCallArg.entries[0].postPending).to.be.undefined;
          expect(secondCallArg.entries[0].newEntry).to.be.true;
          expect(secondCallArg.entries[0].needsSync).to.be.true;
          expect(console.log.calledWith('createEntryFailure')).to.be.true;
          done();
        });
      });

    });

    describe('updateEntry', () => {

      beforeEach(() => {
        const entry = { id: 0, date: '2018-01-01', text: 'a' };
        el.state.entry = entry;
        el.state.entries.push(entry);
      });

      it('should do nothing when entry, property, or entryId is missing', () => {
        Entry.updateEntry(el, {});
        expect(el.set.called).to.be.false;
      });

      it('should do nothing when no entry with the given id exists', () => {
        Entry.updateEntry(el, {
          entry: { date: '2017-01-01' },
          property: 'date',
          entryId: 1
        });
        expect(el.set.called).to.be.false;
      });

      it('should do nothing when there was no change', () => {
        Entry.updateEntry(el, {
          entry: { date: el.state.entry.date },
          property: 'date',
          entryId: 0
        });
        expect(el.set.called).to.be.false;
      });

      it('should set state.entry.date, mark state.entries[entryIndex] for update, and remove the needsSync flag when the network call succeedes', (done) => {
        fetchMock.patch('/api/entry/0', 204);
        const updateObj = {
          entry: { date: '2017-01-01' },
          property: 'date',
          entryId: 0
        };
        Entry.updateEntry(el, updateObj);

        const firstCallArgs = el.set.args[0];
        expect(firstCallArgs[0].entry.date).to.equal(updateObj.entry.date);
        expect(firstCallArgs[0].entry.needsSync).to.be.true;
        expect(firstCallArgs[0].entries[0].date).to.equal(updateObj.entry.date);
        expect(firstCallArgs[0].entries[0].needsSync).to.be.true;

        setTimeout(() => {
          const secondCallArgs = el.set.args[1];
          expect(secondCallArgs[0].entry.date).to.equal(updateObj.entry.date);
          expect(secondCallArgs[0].entry.needsSync).to.be.undefined;
          expect(secondCallArgs[0].entries[0].date).to.equal(updateObj.entry.date);
          expect(secondCallArgs[0].entries[0].needsSync).to.be.undefined;
          done();
        });
      });

      it('should set state.entry.text, mark state.entries[entryIndex] for update, and remove the needsSync flag when the network call succeedes', (done) => {
        fetchMock.patch('/api/entry/0', 204);
        const updateObj = {
          entry: { text: 'b' },
          property: 'text',
          entryId: 0
        };
        Entry.updateEntry(el, updateObj);

        const firstCallArgs = el.set.args[0];
        expect(firstCallArgs[0].entry.text).to.equal(updateObj.entry.text);
        expect(firstCallArgs[0].entry.needsSync).to.be.true;
        expect(firstCallArgs[0].entries[0].text).to.equal(updateObj.entry.text);
        expect(firstCallArgs[0].entries[0].needsSync).to.be.true;

        setTimeout(() => {
          const secondCallArgs = el.set.args[1];
          expect(secondCallArgs[0].entry.text).to.equal(updateObj.entry.text);
          expect(secondCallArgs[0].entry.needsSync).to.be.undefined;
          expect(secondCallArgs[0].entries[0].text).to.equal(updateObj.entry.text);
          expect(secondCallArgs[0].entries[0].needsSync).to.be.undefined;
          done();
        });
      });

      it('should set state.entry.text, mark state.entries[entryIndex] for update, and not remove the needsSync flag when the network call fails', (done) => {
        fetchMock.patch('/api/entry/0', 500);
        const updateObj = {
          entry: { text: 'b' },
          property: 'text',
          entryId: 0
        };
        Entry.updateEntry(el, updateObj);

        const firstCallArgs = el.set.args[0];
        expect(firstCallArgs[0].entry.text).to.equal(updateObj.entry.text);
        expect(firstCallArgs[0].entry.needsSync).to.be.true;
        expect(firstCallArgs[0].entries[0].text).to.equal(updateObj.entry.text);
        expect(firstCallArgs[0].entries[0].needsSync).to.be.true;

        setTimeout(() => {
          expect(el.set.calledTwice).to.be.false;
          expect(console.log.calledWith('updateEntryFailure')).to.be.true;
          done();
        });
      });

    });

    describe('deleteEntry', () => {

      beforeEach(() => {
        const entry = { id: 0 };
        el.state.entry = entry;
        el.state.entries.push(entry);
      });

      it('should do nothing when id is not passed', () => {
        Entry.deleteEntry(el, {});
        expect(el.set.called).to.be.false;
      });

      it('should do nothing when no entry with the given id exists', () => {
        Entry.deleteEntry(el, { id: 1 });
        expect(el.set.called).to.be.false;
      });

      it('should set state.entry to undefined, mark state.entries[entryIndex] for deletion, provide a callback to set, and remove the correct entry when the network call succeedes', (done) => {
        fetchMock.delete('/api/entry/0', 204);
        Entry.deleteEntry(el, { id: 0 });

        const firstCallArgs = el.set.args[0];
        expect(firstCallArgs[0].entry).to.be.undefined;
        expect(firstCallArgs[0].entries[0].needsSync).to.be.true;
        expect(firstCallArgs[0].entries[0].deleted).to.be.true;
        expect(firstCallArgs[0].entries[0].text).to.equal('');
        expect(typeof firstCallArgs[1]).to.equal('function');

        setTimeout(() => {
          const secondCallArgs = el.set.args[1];
          expect(secondCallArgs[0].entries.length).to.equal(0);
          done();
        });
      });

      it('should set state.entry to undefined, mark state.entries[entryIndex] for deletion, provide a callback to set, and not remove the entry when the network call fails', (done) => {
        fetchMock.delete('/api/entry/0', 500);
        Entry.deleteEntry(el, { id: 0 });

        const firstCallArgs = el.set.args[0];
        expect(firstCallArgs[0].entry).to.be.undefined;
        expect(firstCallArgs[0].entries[0].needsSync).to.be.true;
        expect(firstCallArgs[0].entries[0].deleted).to.be.true;
        expect(firstCallArgs[0].entries[0].text).to.equal('');
        expect(typeof firstCallArgs[1]).to.equal('function');

        setTimeout(() => {
          expect(el.set.calledTwice).to.be.false;
          expect(console.log.calledWith('deleteEntryFailure')).to.be.true;
          done();
        });
      });

    });

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

      it('should set new empty entry and unshift it onto entries while also passing a cb', () => {
        el.state.entries.push({ id: 0 });

        Entry.newEntry(el);
        const entry = el.set.args[0][0].entry;
        const entries = el.set.args[0][0].entries;
        expect(entry.text).to.equal('');
        expect(entry.needsSync).to.be.true;
        expect(entry.newEntry).to.be.true;
        expect(entries[0]).to.equal(entry);
        expect(entries[1].id).to.equal(0);
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

    // Can't really test this ATM due to it simply calling route. I don't think spying on route will work here.
    // describe('shiftEntry', () => {

    //   it('should route to the next or prior entry when appropriate', () => {

    //   });

    // });

    describe('removeSlideInProp', () => {

      it('should remove the slideIn prop from all entries after a 50ms debounce', (done) => {
        el.state.entries.push({ id: 0, date: '2018-01-01' });
        el.state.entries.push({ id: 1, date: '2017-01-01', slideIn: true });
        Entry.removeSlideInProp(el);
        expect(el.set.called).to.be.false;

        setTimeout(() => {
          expect(el.state.entries.length).to.equal(2);
          const entries = el.set.args[0][0].entries;
          expect(entries[0].id).to.equal(0);
          expect(entries[0].slideIn).to.be.undefined;
          expect(entries[1].id).to.equal(1);
          expect(entries[1].slideIn).to.be.undefined;
          done();
        }, 60);
      });

    });

  });

});
