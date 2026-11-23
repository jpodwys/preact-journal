import fetchMock from 'fetch-mock';
import { get, set, clear, keys } from 'idb-keyval';
import { app, initialState, resetState, viewEntries } from './index';
import { loadEntries } from '../load';
import { resetDataFetched } from '../actions/entry-actions';
import { saveAccounts } from '../../../test/accounts';
import { devOnly } from '../../../test/mount';
import { mockGetAllEntries } from '../../../test/api-mocks';

// The old app-state module returned a fresh observed object from
// getInitialState(); the new one exports the singleton store `app`, a pure-ish
// `initialState()` and `resetState()`, and a `watch` that holds the computed
// state and the persistence side effects.
describe('appState', () => {
  const login = (id = 42, username = 'testuser') => {
    saveAccounts([{ id, username, active: true }]);
    resetState();
  };

  beforeEach(async () => {
    localStorage.clear();
    await clear();
    history.replaceState(null, '', '/');
    resetState();
  });

  afterEach(async () => {
    resetState();
    localStorage.clear();
    await clear();
    history.replaceState(null, '', '/');
    document.body.classList.remove('dark');
  });

  describe('initialState()', () => {
    it('should return logged-out defaults and clear stale data when there are no accounts', async () => {
      localStorage.setItem('bogus', 'hi');
      await set('bogus', 'hi');
      const state = initialState();

      expect(localStorage.getItem('bogus')).to.be.null;
      expect(await get('bogus')).to.be.undefined;
      expect(state).to.deep.equal({
        accounts: [],
        loggedIn: false,
        userId: '',
        username: '',
        entries: [],
        sort: 'desc',
        filter: '',
        filterText: '',
        entryIndex: -1,
        entry: undefined,
        dialogMode: '',
        fresh: [],
        view: '/',
        dark: false,
        timestamp: undefined
      });
    });

    it('should derive the logged-in user, timestamp and dark mode from localStorage', () => {
      saveAccounts([
        { id: 7, username: 'other', active: false },
        { id: 42, username: 'testuser', active: true }
      ]);
      localStorage.setItem('timestamp_42', '1234');
      localStorage.setItem('timestamp_7', '9999');
      localStorage.setItem('dark', 'true');
      const state = initialState();

      expect(state.loggedIn).to.be.true;
      expect(state.userId).to.equal('42');
      expect(state.username).to.equal('testuser');
      expect(state.timestamp).to.equal('1234');
      expect(state.dark).to.be.true;
    });

    it('should leave timestamp undefined for a logged-in user without one', () => {
      saveAccounts([{ id: 42, username: 'testuser', active: true }]);
      expect(initialState().timestamp).to.be.undefined;
    });

    it('should not clear data when accounts exist but none is active', () => {
      saveAccounts([{ id: 42, username: 'testuser', active: false, expired: true }]);
      localStorage.setItem('bogus', 'hi');
      const state = initialState();
      expect(state.loggedIn).to.be.false;
      expect(state.userId).to.equal('');
      expect(localStorage.getItem('bogus')).to.equal('hi');
    });

    it('should read the stored accounts format ({ id, username, active, expired }) and pick the active one', () => {
      localStorage.setItem('accounts', JSON.stringify([
        { id: 1, username: 'old', active: false, expired: true },
        { id: 2, username: 'bob', active: true },
        { id: 3, username: 'cy', active: false }
      ]));
      const state = initialState();
      expect(state).to.include({ loggedIn: true, userId: '2', username: 'bob' });
    });

    it('should treat a list whose only account is expired as logged out, without clearing storage', () => {
      localStorage.setItem('accounts', JSON.stringify([{ id: 1, username: 'old', active: false, expired: true }]));
      localStorage.setItem('dark', 'true');
      const state = initialState();
      expect(state).to.include({ loggedIn: false, userId: '', username: '' });
      expect(localStorage.getItem('dark')).to.equal('true');   // the "no accounts" wipe did not run
    });

    it('should derive view from location.pathname', () => {
      history.replaceState(null, '', '/entry/1234');
      expect(initialState().view).to.equal('/entry');
      history.replaceState(null, '', '/entry/new');
      expect(initialState().view).to.equal('/new');
      history.replaceState(null, '', '/entries');
      expect(initialState().view).to.equal('/entries');
    });

    it('should return a fresh object and not touch the store', () => {
      app.filterText = 'kept';
      const a = initialState();
      const b = initialState();
      expect(a).to.not.equal(b);
      expect(a.entries).to.not.equal(b.entries);
      expect(app.filterText).to.equal('kept');
    });
  });

  describe('resetState()', () => {
    it('should reset the store to a freshly computed initial state', () => {
      Object.assign(app, {
        sort: 'asc', filter: 'favorites', filterText: 'x', entryIndex: 3,
        entry: { id: 1 }, entries: [{ id: 1, date: '2024-01-01', text: 'x' }], dialogMode: 'menu'
      });
      saveAccounts([{ id: 42, username: 'testuser', active: true }]);
      resetState();
      const { entries, ...rest } = app;
      const { entries: e2, ...expected } = initialState();
      expect(rest).to.deep.equal(expected);
      expect(entries).to.deep.equal([]);
      expect(viewEntries()).to.deep.equal([]);
      expect(app.userId).to.equal('42');
    });

    it('should not persist the blank entries over the user\'s cached entries in IndexedDB', async () => {
      login();
      const cached = [{ id: 1, date: '2024-01-01', text: 'keep me' }];
      app.entries = cached;
      expect(await get('entries_42')).to.deep.equal(cached);

      resetState();

      expect(app.entries).to.deep.equal([]);
      expect(await get('entries_42')).to.deep.equal(cached);
    });

    it('should persist entries again after a reset', async () => {
      login();
      resetState();
      app.entries = [{ id: 2, date: '2024-01-02', text: 'after' }];
      expect(await get('entries_42')).to.deep.equal([{ id: 2, date: '2024-01-02', text: 'after' }]);
    });
  });

  describe('viewEntries() (derived from entries, view, filter, filterText and sort)', () => {
    const entries = [
      { id: 1, date: '2018-01-01', text: 'hi there', favorited: true },
      { id: 2, date: '2019-01-01', text: 'yo' },
      { id: 3, date: '2020-01-01', text: 'gone', deleted: true }
    ];
    const ids = () => viewEntries().map(e => e.id);

    beforeEach(() => {
      app.view = '/entries';
    });

    it('should recompute when entries change (excluding deleted, newest first)', () => {
      expect(viewEntries().length).to.equal(0);
      app.entries = entries;
      expect(ids()).to.deep.equal([2, 1]);
    });

    it('should recompute when filterText changes', () => {
      app.entries = entries;
      app.filterText = 'yo';
      expect(ids()).to.deep.equal([2]);
      app.filterText = 'nomatch';
      expect(ids()).to.deep.equal([]);
    });

    it('should recompute when filter changes', () => {
      app.entries = entries;
      app.filter = 'favorites';
      expect(ids()).to.deep.equal([1]);
    });

    it('should recompute when sort changes', () => {
      app.entries = entries;
      app.sort = 'asc';
      expect(ids()).to.deep.equal([1, 2]);
    });

    it('should recompute when view changes (/search with no query or filter is empty)', () => {
      app.entries = entries;
      app.view = '/search';
      expect(ids()).to.deep.equal([]);
      app.view = '/entries';
      expect(ids()).to.deep.equal([2, 1]);
    });

    it('should not recompute on unrelated writes', () => {
      app.entries = entries;
      const before = viewEntries();
      app.entryIndex = 1;
      app.dialogMode = 'menu';
      expect(viewEntries()).to.equal(before);   // memoized: the very same array
    });

    it('should return a new array when any input changes', () => {
      app.entries = entries;
      const before = viewEntries();
      app.filter = 'favorites';
      expect(viewEntries()).to.not.equal(before);
      expect(ids()).to.deep.equal([1]);
    });

    it('is not a stored field, so nothing can assign it: a stray app.viewEntries write changes nothing', () => {
      app.entries = entries;
      expect('viewEntries' in app).to.be.false;
      app.viewEntries = [{ id: 99, date: 'x', text: 'forged' }];
      expect(ids()).to.deep.equal([2, 1]);
      app.sort = 'asc';
      expect(ids()).to.deep.equal([1, 2]);
    });

    devOnly('is frozen in dev, so a consumer cannot corrupt the memoized array', () => {
      app.entries = entries;
      expect(() => viewEntries().push({ id: 9 })).to.throw(TypeError);
    });
  });

  describe('accounts', () => {
    it('should be written to localStorage in the stored format whenever they change', () => {
      app.accounts = [{ id: 1, username: 'a', active: false }, { id: 2, username: 'b', active: true, expired: false }];
      expect(JSON.parse(localStorage.getItem('accounts'))).to.deep.equal([
        { id: 1, username: 'a', active: false },
        { id: 2, username: 'b', active: true, expired: false }
      ]);
    });

    it('should be read back by a page load (initialState) exactly as written', () => {
      const list = [{ id: 7, username: 'z', active: true }, { id: 8, username: 'y', active: false, expired: true }];
      app.accounts = list;
      expect(initialState().accounts).to.deep.equal(list);
    });

    it('should survive bad stored JSON as an empty list', () => {
      localStorage.setItem('accounts', '{not json');
      expect(initialState().accounts).to.deep.equal([]);
    });

    it('a reset never writes them (it only re-reads)', () => {
      localStorage.setItem('accounts', '[{"id":1,"username":"a","active":true}]   ');   // odd spacing survives only if nothing re-serialized it
      resetState();
      expect(localStorage.getItem('accounts')).to.equal('[{"id":1,"username":"a","active":true}]   ');
      expect(app.accounts).to.deep.equal([{ id: 1, username: 'a', active: true }]);
    });
  });

  describe('persistence', () => {
    // The old proxy sorted entries before persisting; sorting now happens in
    // the actions (they write a sorted copy), so the watch persists as given.
    it('should persist entries to IndexedDB under the active user', async () => {
      login();
      const entries = [{ id: 1, date: '2017-01-01', text: 'a' }, { id: 2, date: '2018-01-01', text: 'b' }];
      app.entries = entries;
      expect(await get('entries_42')).to.deep.equal(entries);
    });

    it('should not persist entries when logged out', async () => {
      app.entries = [{ id: 1, date: '2017-01-01', text: 'a' }];
      expect(await keys()).to.deep.equal([]);
    });

    it('should persist dark to localStorage and toggle the body class', () => {
      app.dark = true;
      expect(localStorage.getItem('dark')).to.equal('true');
      expect(document.body.classList.contains('dark')).to.be.true;

      app.dark = false;
      expect(localStorage.getItem('dark')).to.equal('false');
      expect(document.body.classList.contains('dark')).to.be.false;
    });

    it('should persist timestamp under the active user', () => {
      login();
      expect(localStorage.getItem('timestamp_42')).to.be.null;
      app.timestamp = 1234;
      expect(localStorage.getItem('timestamp_42')).to.equal('1234');
    });

    it('should not persist timestamp when logged out or when it becomes undefined', () => {
      app.timestamp = 1234;
      expect(localStorage.length).to.equal(0);

      login();
      app.timestamp = 1234;
      app.timestamp = undefined;
      expect(localStorage.getItem('timestamp_42')).to.equal('1234');
    });
  });

  describe('view watcher', () => {
    // dialogMode is cleared on every view change, regardless of the pair.
    ['/entries', '/search', '/entry', '/new', '/'].forEach((targetView) => {
      it(`clears dialogMode when transitioning to ${targetView}`, () => {
        app.view = targetView === '/switch' ? '/' : '/switch';
        app.dialogMode = 'menu';
        app.view = targetView;
        expect(app.dialogMode).to.equal('');
      });
    });

    it('clears filters when navigating from /search to /entries', () => {
      app.view = '/search';
      Object.assign(app, { filter: 'favorites', filterText: 'hi' });
      app.view = '/entries';
      expect(app.filter).to.equal('');
      expect(app.filterText).to.equal('');
    });

    it('does not clear filters on other view transitions', () => {
      Object.assign(app, { filter: 'favorites', filterText: 'hi' });
      app.view = '/entries';
      app.view = '/search';
      app.view = '/entry';
      app.view = '/entries'; // from /entry, not /search
      app.view = '/new';
      expect(app.filter).to.equal('favorites');
      expect(app.filterText).to.equal('hi');
    });
  });

  devOnly('deep-freezes assigned values so in-place mutation throws', () => {
    const entries = [{ id: 1, date: '2024-01-01', text: 'a' }, { id: 2, date: '2024-01-02', text: 'b' }];
    app.entries = entries;
    expect(() => { app.entries.push({ id: 3 }); }).to.throw(TypeError);
    expect(() => { app.entries[0].text = 'changed'; }).to.throw(TypeError);
    expect(() => { app.entries.sort((a, b) => b.id - a.id); }).to.throw(TypeError);
    expect(app.entries.map(e => e.id + e.text)).to.deep.equal(['1a', '2b']);
  });

  // Boot hydration moved out of app-state into js/load (loadEntries), which
  // calls the boot action instead of fire('boot'); assert the store it fills.
  describe('boot hydration from IndexedDB (js/load)', () => {
    beforeEach(() => {
      fetchMock.restore();
      mockGetAllEntries({ entries: [] });
      resetDataFetched();
    });

    afterEach(async () => {
      await fetchMock.flush();
      fetchMock.restore();
      resetDataFetched();
    });

    it('loads the entries stored in IDB for the active account into the store', async () => {
      saveAccounts([{ id: 42, username: 'test', active: true }]);
      const stored = [{ id: 1, date: '2024-05-01', text: 'first' }];
      await set('entries_42', stored);
      resetState();

      await loadEntries();

      expect(app.entries).to.deep.equal(stored);
      expect(viewEntries().map(e => e.text)).to.deep.equal(['first']);
      expect(fetchMock.called('/api/entries')).to.be.true;
    });

    it('boots with an empty array when IDB has nothing for the active account', async () => {
      saveAccounts([{ id: 7, username: 'fresh', active: true }]);
      resetState();

      await loadEntries();

      expect(app.entries).to.deep.equal([]);
      // boot ran: with no timestamp it fetches everything from the server
      expect(fetchMock.called('/api/entries')).to.be.true;
    });

    it('does not boot when no account is active', async () => {
      app.entries = [{ id: 9, date: '2024-01-01', text: 'untouched' }];
      await loadEntries();
      expect(app.entries.map(e => e.text)).to.deep.equal(['untouched']);
      expect(fetchMock.called()).to.be.false;
    });
  });
});
