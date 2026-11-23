import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { clear as idbClear, get as idbGet, set as idbSet } from 'idb-keyval';
import { mount, fireEvent, settle } from '../../../test/mount';
import App from './index';
import { resetDataFetched } from '../../js/actions/entry-actions';
import { loadEntries } from '../../js/load';
import { saveAccounts } from '../../../test/accounts';
import {
  mockGetAllEntries,
  mockSyncEntries,
  mockCreateEntry,
  mockUpdateEntry,
  mockDeleteEntry,
  mockLogin,
  mockLogout,
  mockEntryApiOffline,
  lastBody
} from '../../../test/api-mocks';

const flush = (ms = 50) => new Promise(r => setTimeout(r, ms));
// 500ms matches the entry component's debounce (client/components/entry/index.js
// `upsert = debounce(this.slowUpsert, 500)`); the extra 60ms lets the post-
// debounce promise chain (action → network → handler) settle before assertions.
const tickDebounce = () => flush(560);

describe('App — integration journeys', () => {
  let env;

  beforeEach(async () => {
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    // dataFetched is module-scoped in entry-actions; production resets it via
    // login. Tests don't run login each time, so reset it explicitly.
    resetDataFetched();
    history.replaceState(null, null, '/entries');
    saveAccounts([{ id: 99, username: 'alice', active: true }]);
  });

  afterEach(async () => {
    if(env) env.cleanup();
    env = null;
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    history.replaceState(null, '', '/');
    document.body.onscroll = null;
  });

  async function bootApp () {
    env = mount(h(App, null));
    // The entry point loads the user's cached entries from IndexedDB after the
    // first render; do the same, then let it settle.
    await loadEntries();
    await flush();
    await settle();
  }

  // Seed an entry (or list) into the active user's IDB store and set the
  // timestamp so boot routes through syncEntries (which calls
  // syncClientEntries to replay any needsSync rows).
  async function seedEntries (entries) {
    await idbSet('entries_99', entries);
    localStorage.setItem('timestamp_99', '1000');
  }
  const seedEntry = (entry) => seedEntries([entry]);

  describe('write new entry', () => {
    describe('online', () => {
      it('writes a new entry and shows it on /entries after navigating back', async () => {
        mockGetAllEntries({ entries: [] });
        mockCreateEntry({ id: 12345 });
        await bootApp();

        const fab = env.host.querySelector('a[href="/entry/new"]');
        expect(fab, 'FAB rendered on /entries').to.exist;
        fireEvent.click(fab);
        await settle();

        const et = env.host.querySelector('#et');
        expect(et, 'should land on /new').to.exist;

        et.innerText = 'first entry';
        fireEvent.input(et);
        await settle();
        await tickDebounce();
        await settle();
        await flush(); // POST resolves → createEntrySuccess clears flags
        await settle();

        expect(fetchMock.called('/api/entry', 'POST'), 'POST fired').to.be.true;
        expect(lastBody('/api/entry').text).to.equal('first entry');

        await new Promise(r => {
          window.addEventListener('popstate', () => r(), { once: true });
          history.back();
        });
        await flush();
        await settle();

        expect(env.queryByText('first entry'), 'entry visible on list').to.exist;
        expect(env.queryByText("It's empty in here!")).to.be.null;
      });
    });

    describe('offline — write half', () => {
      it('persists the queued entry to IDB with needsSync after the POST fails', async () => {
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/new"]'));
        await settle();
        const et = env.host.querySelector('#et');
        et.innerText = 'offline entry';
        fireEvent.input(et);
        await settle();
        await tickDebounce();
        await settle();
        await flush();
        await settle();

        const stored = await idbGet('entries_99');
        expect(stored).to.be.an('array');
        expect(stored.length).to.equal(1);
        expect(stored[0].text).to.equal('offline entry');
        expect(stored[0].needsSync, 'needsSync set').to.be.true;
        expect(stored[0].newEntry, 'newEntry set').to.be.true;
        expect(stored[0].postPending, 'postPending cleared after failure').to.be.undefined;
      });
    });

    describe('offline — replay half', () => {
      it('replays the queued create on next online boot', async () => {
        const pendingId = Date.now();
        await idbSet('entries_99', [{
          id: pendingId,
          date: '2024-01-01',
          text: 'queued offline',
          newEntry: true,
          needsSync: true
        }]);
        localStorage.setItem('timestamp_99', '1700000000000');

        mockSyncEntries({ entries: [], timestamp: 1700000001000 });
        mockCreateEntry({ id: 99999 });

        await bootApp();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry', 'POST'), 'queued POST replayed').to.be.true;
        const body = lastBody('/api/entry');
        expect(body.text).to.equal('queued offline');
        expect(body.date).to.equal('2024-01-01');
      });
    });
  });

  describe('edit entry', () => {
    const seeded = { id: 5, date: '2024-01-01', text: 'original' };

    describe('online', () => {
      it('edits an entry and PATCHes the new text', async () => {
        await seedEntry(seeded);
        mockSyncEntries();
        mockUpdateEntry(5);
        await bootApp();

        const row = env.host.querySelector('a[href="/entry/5"]');
        expect(row, 'list row rendered').to.exist;
        fireEvent.click(row);
        await settle();

        const et = env.host.querySelector('#et');
        expect(et, 'on entry view').to.exist;

        et.innerText = 'edited online';
        fireEvent.input(et);
        await settle();
        await tickDebounce();
        await settle();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true;
        expect(lastBody('/api/entry/5').text).to.equal('edited online');
      });

      it('leaving the entry within the debounce window still saves the edit', async () => {
        await seedEntry(seeded);
        mockSyncEntries();
        mockUpdateEntry(5);
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();
        const et = env.host.querySelector('#et');
        et.innerText = 'edited then left';
        fireEvent.input(et);
        // Go back at once, far inside the 500ms debounce.
        await new Promise(r => {
          window.addEventListener('popstate', () => r(), { once: true });
          history.back();
        });
        await flush();
        await settle();

        expect(env.queryByText('first'), 'back on the list').to.be.null;
        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired on the way out').to.be.true;
        expect(lastBody('/api/entry/5').text).to.equal('edited then left');
      });
    });

    describe('offline — write half', () => {
      it('persists the edit to IDB with needsSync after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();
        const et = env.host.querySelector('#et');
        et.innerText = 'edited offline';
        fireEvent.input(et);
        await settle();
        await tickDebounce();
        await settle();
        await flush();
        await settle();

        const stored = await idbGet('entries_99');
        expect(stored.length).to.equal(1);
        expect(stored[0].text).to.equal('edited offline');
        expect(stored[0].needsSync).to.be.true;
      });
    });

    describe('offline — replay half', () => {
      it('replays the queued edit on boot', async () => {
        await idbSet('entries_99', [{
          ...seeded,
          text: 'edited offline',
          needsSync: true
        }]);
        localStorage.setItem('timestamp_99', '1000');

        mockSyncEntries();
        mockUpdateEntry(5);

        await bootApp();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'queued PATCH replayed').to.be.true;
        expect(lastBody('/api/entry/5').text).to.equal('edited offline');
      });
    });
  });

  describe('delete entry', () => {
    const seeded = { id: 5, date: '2024-01-01', text: 'will be gone' };

    describe('online', () => {
      it('confirms and deletes an entry, removing it from the list', async () => {
        await seedEntry(seeded);
        mockSyncEntries();
        mockDeleteEntry(5);
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();
        const deleteIcon = env.getByRole('button', { name: 'Delete entry' });
        expect(deleteIcon, 'delete icon on entry view').to.exist;
        fireEvent.click(deleteIcon);
        await settle();

        expect(env.queryByText('Delete this entry?'), 'confirm modal opened').to.exist;
        fireEvent.click(env.getByText('Delete'));
        await settle();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry/5', 'DELETE'), 'DELETE fired').to.be.true;
        expect(env.queryByText('will be gone'), 'row gone from list').to.be.null;
      });
    });

    describe('offline — write half', () => {
      it('marks the entry deleted in IDB after DELETE fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();
        fireEvent.click(env.getByRole('button', { name: 'Delete entry' }));
        await settle();
        fireEvent.click(env.getByText('Delete'));
        await settle();
        await flush();
        await settle();

        const stored = await idbGet('entries_99');
        // Splice only happens on DELETE success; offline keeps the row with
        // deleted: true so the next online boot can replay it.
        expect(stored.length).to.equal(1);
        expect(stored[0].deleted, 'deleted flag set').to.be.true;
        expect(stored[0].needsSync, 'needsSync set').to.be.true;
        expect(stored[0].text).to.equal('');
      });
    });

    describe('offline — replay half', () => {
      it('replays the queued delete on boot', async () => {
        await idbSet('entries_99', [{
          id: 5, date: '2024-01-01', text: '', deleted: true, needsSync: true
        }]);
        localStorage.setItem('timestamp_99', '1000');

        mockSyncEntries();
        mockDeleteEntry(5);

        await bootApp();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry/5', 'DELETE'), 'queued DELETE replayed').to.be.true;
      });
    });
  });

  describe('toggle favorite', () => {
    const seeded = { id: 5, date: '2024-01-01', text: 'fave me', favorited: false };

    describe('online', () => {
      it('toggles favorite via header star and PATCHes the change', async () => {
        await seedEntry(seeded);
        mockSyncEntries();
        mockUpdateEntry(5);
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();

        const star = env.getByRole('button', { name: 'Toggle favorite' });
        expect(star, 'empty star on entry view').to.exist;
        fireEvent.click(star);
        await settle();
        await flush();
        await settle();

        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true;
        expect(lastBody('/api/entry/5')).to.deep.equal({ favorited: true });
        expect(env.getByRole('button', { name: 'Toggle favorite' }).getAttribute('icon'), 'star is now filled').to.equal('star-filled');
      });
    });

    describe('offline — write half', () => {
      it('persists the favorite toggle to IDB with needsSync after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        await settle();
        fireEvent.click(env.getByRole('button', { name: 'Toggle favorite' }));
        await settle();
        await flush();
        await settle();

        const stored = await idbGet('entries_99');
        expect(stored[0].favorited).to.be.true;
        expect(stored[0].needsSync).to.be.true;
      });
    });

    describe('offline — replay half', () => {
      it('replays the queued favorite toggle on boot via putEntry', async () => {
        await idbSet('entries_99', [{
          ...seeded, favorited: true, needsSync: true
        }]);
        localStorage.setItem('timestamp_99', '1000');

        mockSyncEntries();
        mockUpdateEntry(5);

        await bootApp();
        await flush();
        await settle();

        // syncClientEntries routes a non-new, non-deleted needsSync entry
        // through putEntry, which PATCHes the whole entry as the body.
        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'queued PATCH replayed').to.be.true;
        expect(lastBody('/api/entry/5').favorited).to.be.true;
      });
    });
  });

  describe('search', () => {
    it('typing in the filter narrows the visible list', async () => {
      await seedEntries([
        { id: 1, date: '2024-01-01', text: 'beach day' },
        { id: 2, date: '2024-01-02', text: 'mountain hike' }
      ]);
      mockSyncEntries();
      await bootApp();

      expect(env.host.querySelectorAll('.entry-preview').length).to.equal(2);

      fireEvent.click(env.host.querySelector('a[href="/search"]'));
      await settle();

      // /search with no filter shows the Favorites / On this day menu.
      expect(env.queryByText('Favorites')).to.exist;
      expect(env.host.querySelectorAll('.entry-preview').length).to.equal(0);

      const input = env.host.querySelector('#fi');
      fireEvent.input(input, 'beach');
      await settle();
      await flush(160); // header debounce is 100ms
      await settle();

      const previews = env.host.querySelectorAll('.entry-preview');
      expect(previews.length).to.equal(1);
      expect(env.host.querySelector('a[href="/entry/1"]'), 'beach entry visible').to.exist;
    });
  });

  describe('login', () => {
    beforeEach(() => {
      // Override outer setup: start logged-out
      localStorage.removeItem('accounts');
      history.replaceState(null, '', '/');
    });

    it('logging in lands on /entries with the user\'s entries fetched', async () => {
      // No pre-seeding: getInitialState's "no-accounts" branch calls
      // clearData() which wipes IDB + localStorage. Post-login entries come
      // from the server response, not local storage.
      mockLogin({ id: 99, username: 'alice' });
      mockGetAllEntries({ entries: [{ id: 11, date: '2024-01-01', text: 'mine' }] });

      await bootApp();

      expect(env.queryByText('Login'), 'login form rendered').to.exist;

      fireEvent.input(env.host.querySelector('#luser'), 'alice');
      await settle();
      fireEvent.input(env.host.querySelector('#lpass'), 'pass1');
      await settle();
      fireEvent.submit(env.getByRole('form'));
      await settle();
      // login → loginSuccess → activateAccount → IDB get → setState
      // → getEntries → GET /api/entries. Two flushes cover the chain.
      await flush();
      await settle();
      await flush();
      await settle();

      expect(fetchMock.called('/api/user/login', 'POST')).to.be.true;

      const accounts = JSON.parse(localStorage.getItem('accounts'));
      expect(accounts).to.have.length(1);
      expect(accounts[0].id).to.equal(99);
      expect(accounts[0].active).to.be.true;

      expect(env.host.querySelector('a[href="/entry/11"]'), 'list row rendered after login').to.exist;
    });
  });

  describe('account switch', () => {
    beforeEach(async () => {
      localStorage.clear();
      saveAccounts([
        { id: 1, username: 'alice', active: true },
        { id: 2, username: 'bob', active: false }
      ]);
      await idbSet('entries_1', [{ id: 11, date: '2024-01-01', text: 'alice entry' }]);
      await idbSet('entries_2', [{ id: 22, date: '2024-01-02', text: 'bob entry' }]);
    });

    it('switching accounts loads the new user\'s entries', async () => {
      mockGetAllEntries({ entries: [] });

      await bootApp();

      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry visible').to.exist;

      fireEvent.click(env.getByRole('button', { name: 'Menu' }));
      await settle();
      fireEvent.click(env.getByText('Switch'));
      await settle();
      // activateAccount → IDB get → setState → getEntries → GET → success
      await flush();
      await settle();
      await flush();
      await settle();

      expect(env.host.querySelector('a[href="/entry/22"]'), 'bob entry visible').to.exist;
      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry gone').to.not.exist;

      const accounts = JSON.parse(localStorage.getItem('accounts'));
      expect(accounts.find(a => a.id === 2).active).to.be.true;
      expect(accounts.find(a => a.id === 1).active).to.be.false;
    });
  });

  describe('logout', () => {
    const storedAccounts = () => JSON.parse(localStorage.getItem('accounts') || '[]');
    const logOut = async () => {
      fireEvent.click(env.getByRole('button', { name: 'Menu' }));
      await settle();
      fireEvent.click(env.getByText('Logout'));            // closes the menu, then opens the confirm dialog
      await flush();
      await settle();
      fireEvent.click(env.getByRole('button', { name: 'Logout' }));
      await flush();
      await settle();
      await flush();
      await settle();
    };

    it('logging out the only account lands on the login page and forgets the account', async () => {
      mockGetAllEntries({ entries: [] });
      mockLogout();
      await bootApp();

      await logOut();

      expect(fetchMock.called('/api/user/logout', 'POST'), 'logout POST fired').to.be.true;
      expect(env.queryByText('Login'), 'login form rendered').to.exist;
      expect(location.pathname).to.equal('/');
      expect(storedAccounts()).to.have.length(0);
    });

    it('logging out one of two accounts switches to the other and keeps only it', async () => {
      localStorage.clear();
      saveAccounts([
        { id: 1, username: 'alice', active: true },
        { id: 2, username: 'bob', active: false }
      ]);
      await idbSet('entries_1', [{ id: 11, date: '2024-01-01', text: 'alice entry' }]);
      await idbSet('entries_2', [{ id: 22, date: '2024-01-02', text: 'bob entry' }]);
      mockGetAllEntries({ entries: [] });
      mockLogout();
      await bootApp();
      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry visible').to.exist;

      await logOut();

      expect(env.host.querySelector('a[href="/entry/22"]'), 'bob entry visible').to.exist;
      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry gone').to.not.exist;
      const accounts = storedAccounts();
      expect(accounts.map(a => a.id)).to.deep.equal([2]);
      expect(accounts[0].active).to.be.true;
    });
  });

  describe('expired session', () => {
    const storedAccounts = () => JSON.parse(localStorage.getItem('accounts') || '[]');

    it('a 401 on the only account marks it expired and shows the login page', async () => {
      await seedEntry({ id: 5, date: '2024-01-01', text: 'kept locally' });
      mockSyncEntries({ httpStatus: 401 });
      await bootApp();
      await flush();
      await settle();

      expect(env.queryByText('Login'), 'login form rendered').to.exist;
      expect(location.pathname).to.equal('/');
      const accounts = storedAccounts();
      expect(accounts).to.have.length(1);
      expect(accounts[0]).to.include({ id: 99, expired: true, active: false });
    });

    it('a 401 with another valid account switches to it', async () => {
      localStorage.clear();
      saveAccounts([
        { id: 1, username: 'alice', active: true },
        { id: 2, username: 'bob', active: false }
      ]);
      await idbSet('entries_1', [{ id: 11, date: '2024-01-01', text: 'alice entry' }]);
      await idbSet('entries_2', [{ id: 22, date: '2024-01-02', text: 'bob entry' }]);
      localStorage.setItem('timestamp_1', '1000');
      mockSyncEntries({ httpStatus: 401 });
      await bootApp();
      await flush();
      await settle();
      await flush();
      await settle();

      expect(env.host.querySelector('a[href="/entry/22"]'), 'bob entry visible').to.exist;
      const accounts = storedAccounts();
      expect(accounts.find(a => a.id === 1)).to.include({ expired: true, active: false });
      expect(accounts.find(a => a.id === 2).active).to.be.true;
    });
  });
});
