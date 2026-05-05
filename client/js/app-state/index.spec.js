import { get, set, clear } from 'idb-keyval';
import getInitialState from './index';
import { Provider } from '../../components/unifire';

describe('appState', () => {
  let state;

  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, '', '/');
    state = getInitialState();
  });

  // afterEach(() => {
  //   localStorage.clear();
  // });

  it('should return correct defaults', () => {
    localStorage.setItem('bogus', 'hi');
    state = getInitialState();

    expect(localStorage.getItem('bogus')).to.be.null;
    expect(typeof state).to.equal('object');
    expect(state.scrollPosition).to.equal(0);
    expect(state.view).to.equal('/');
    expect(state.filterText).to.equal('');
    expect(state.loggedIn).to.be.false;
    expect(state.userId).to.equal('');
    expect(state.username).to.equal('');
    expect(state.timestamp).to.be.undefined;
    expect(state.entry).to.be.undefined;
    expect(state.dialogMode).to.be.undefined;
    expect(state.entryIndex).to.equal(-1);
    expect(state.entries.length).to.equal(0);
    expect(state.viewEntries.length).to.equal(0);
    expect(state.dark).to.be.false;

    var accounts = [{ id: 42, username: 'testuser', active: true }];
    localStorage.setItem('accounts', JSON.stringify(accounts));
    set('entries_42', [ { id: 0, date: '2018-01-01', text: 'yo' } ]);
    localStorage.setItem('timestamp_42', '1234');
    localStorage.setItem('dark', 'true');
    state = getInitialState();

    expect(state.loggedIn).to.be.true;
    expect(state.userId).to.equal('42');
    expect(state.username).to.equal('testuser');
    expect(state.timestamp).to.equal('1234');
    expect(state.dark).to.be.true;
  });

  it('should persist dark, timestamp, and entries (date-sorted) to localStorage when changed', async () => {
    // Set up an active account so namespaced keys work
    localStorage.clear();
    var accounts = [{ id: 1, username: 'test', active: true }];
    localStorage.setItem('accounts', JSON.stringify(accounts));
    state = getInitialState();

    // getInitialState writes dark:false to localStorage, so clear and re-check
    expect(localStorage.getItem('timestamp_1')).to.be.null;
    let entries = await get('entries_1');
    expect(entries).to.be.undefined;

    state.dark = true;
    state.timestamp = 1234;

    const OLDER = '2017-01-01';
    const NEWER = '2018-01-01';
    state.entries = [ { date: OLDER }, { date: NEWER } ];

    expect(localStorage.getItem('dark')).to.equal('true');
    expect(localStorage.getItem('timestamp_1')).to.equal('1234');

    entries = await get('entries_1');
    expect(entries[0].date).to.equal(NEWER);
    expect(entries[1].date).to.equal(OLDER);
  });

  it('should compute and set viewEntries whenever entries or filterText change', () => {
    expect(state.viewEntries.length).to.equal(0);

    state.entries = [ { date: '2018-01-01', text: 'hi' } ];
    expect(state.viewEntries[0].text).to.equal('hi');

    state.filterText = 'yo';
    expect(state.viewEntries.length).to.equal(0);
  });

  describe('boot hydration from IndexedDB', () => {
    beforeEach(async () => {
      localStorage.clear();
      await clear();
    });

    it('fires boot with the entries stored in IDB for the active account', async () => {
      localStorage.setItem('accounts', JSON.stringify([
        { id: 42, username: 'test', active: true }
      ]));
      const stored = [{ id: 1, date: '2024-05-01', text: 'first' }];
      await set('entries_42', stored);

      const boot = sinon.spy();
      new Provider({ state: {}, actions: { boot }, children: [] });

      getInitialState();
      // idb-keyval get is async; yield to the microtask + macrotask queues
      // so the .then(fire('boot')) inside getInitialState can run.
      await new Promise(r => setTimeout(r, 10));

      expect(boot.calledOnce).to.be.true;
      const payload = boot.args[0][1];
      expect(payload.entries).to.have.length(1);
      expect(payload.entries[0].text).to.equal('first');
    });

    it('fires boot with an empty array when IDB has nothing for the active account', async () => {
      localStorage.setItem('accounts', JSON.stringify([
        { id: 7, username: 'fresh', active: true }
      ]));

      const boot = sinon.spy();
      new Provider({ state: {}, actions: { boot }, children: [] });

      getInitialState();
      await new Promise(r => setTimeout(r, 10));

      expect(boot.calledOnce).to.be.true;
      expect(boot.args[0][1].entries).to.deep.equal([]);
    });

    it('does not fire boot when no account is active', async () => {
      const boot = sinon.spy();
      new Provider({ state: {}, actions: { boot }, children: [] });

      getInitialState();
      await new Promise(r => setTimeout(r, 10));

      expect(boot.called).to.be.false;
    });
  });

});
