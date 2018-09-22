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

  });

  describe('userActions', () => {
    const USER = { username: 'bogus', password: 'value' };

    beforeEach(() => {
      
    });

    afterEach(() => {
      
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
    // createEntry

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

  });

});
