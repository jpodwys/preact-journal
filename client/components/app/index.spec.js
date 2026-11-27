import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { clear as idbClear, get as idbGet, set as idbSet } from 'idb-keyval';
import { mount, within, fireEvent, waitFor, networkIdle } from '../../../test/mount';
import App from './index';
import { resetSync } from '../../js/sync';
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

// Was a request with this method sent to any URL?
const sent = method => fetchMock.calls().some(([, options]) => options && options.method === method);

// Resolves once history.back() has landed.
const goBack = () => new Promise(r => {
  window.addEventListener('popstate', () => r(), { once: true });
  history.back();
});

describe('App — integration journeys', () => {
  let env;

  beforeEach(async () => {
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    // dataFetched is module-scoped in entry-actions; production resets it via
    // login. Tests don't run login each time, so reset it explicitly.
    resetSync();
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
    // first render; do the same, then wait for the boot requests to finish so no
    // late response lands in the middle of what the test does next.
    await loadEntries();
    await networkIdle();
  }

  // Seed an entry (or list) into the active user's IDB store and set the
  // timestamp so boot routes through syncEntries (which calls
  // sync() to send any unsent rows).
  async function seedEntries (entries) {
    await idbSet('entries_99', entries);
    localStorage.setItem('timestamp_99', '1000');
  }
  const seedEntry = (entry) => seedEntries([entry]);

  // ---- what the user does ----
  const click = async (selector) => fireEvent.click(await env.findBySelector(selector));
  const clickText = async (text) => fireEvent.click(await env.findByText(text));
  const clickButton = async (name) => fireEvent.click(await env.findByRole('button', { name }));
  // The list rows have "Delete entry" and "Toggle favorite" buttons too: this is the one in the page header, which
  // only has them on an entry view.
  async function clickHeaderButton (name) {
    const banner = env.getByRole('banner');
    const button = await within(banner).findByRole('button', { name });
    fireEvent.click(button);
  }
  // Type into the entry editor (the app must be on, or on its way to, an entry view).
  async function typeEntry (text) {
    const et = await env.findBySelector('#et');
    et.innerText = text;
    fireEvent.input(et);
  }

  describe('write new entry', () => {
    describe('online', () => {
      it('writes a new entry and shows it on /entries after navigating back', async () => {
        mockGetAllEntries({ entries: [] });
        mockCreateEntry({ id: 12345 });
        await bootApp();

        await click('a[href="/entry/new"]');
        await typeEntry('first entry');

        await waitFor(() => expect(fetchMock.called('/api/entry', 'POST'), 'POST fired').to.be.true);
        expect(lastBody('/api/entry').text).to.equal('first entry');
        await networkIdle(); // the response gives the entry its server id

        await goBack();
        // The editor also holds this text, so look for it in a list row.
        await waitFor(() => expect(env.getByText('first entry').closest('.entry-preview'), 'entry visible on list').to.exist);
        expect(env.queryByText("It's empty in here!")).to.be.null;
      });
    });

    describe('a new entry slides in on the list', () => {
      it('plays the slide-in when you return to the list, however long you were writing, then settles', async () => {
        mockGetAllEntries({ entries: [] });
        mockCreateEntry({ id: 12345 });
        await bootApp();

        await click('a[href="/entry/new"]');
        await typeEntry('first entry');
        // The POST goes out after the 500ms debounce, which is longer than the 450ms animation window.
        await waitFor(() => expect(fetchMock.called('/api/entry', 'POST')).to.be.true);
        await networkIdle();

        await goBack();
        const preview = () => env.getByText('first entry').closest('.entry-preview');
        await waitFor(() => expect(preview().classList.contains('fade-right'), 'slides in on return').to.be.true);
        await waitFor(() => expect(preview().classList.contains('fade-right'), 'and the class is removed afterwards').to.be.false);
      });
    });

    describe('offline — write half', () => {
      it('persists the queued entry to IDB as unsent after the POST fails', async () => {
        mockEntryApiOffline();
        await bootApp();

        await click('a[href="/entry/new"]');
        await typeEntry('offline entry');
        await waitFor(() => expect(sent('POST'), 'POST attempted').to.be.true);
        await networkIdle(); // let it fail

        const stored = await idbGet('entries_99');
        expect(stored).to.be.an('array');
        expect(stored.length).to.equal(1);
        expect(stored[0].text).to.equal('offline entry');
        expect(stored[0].needsSync, 'unsent').to.be.ok;
        expect(stored[0].newEntry, 'the server has never had it').to.be.true;
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

        await waitFor(() => expect(fetchMock.called('/api/entry', 'POST'), 'queued POST replayed').to.be.true);
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

        await click('a[href="/entry/5"]');
        await typeEntry('edited online');

        await waitFor(() => expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true);
        expect(lastBody('/api/entry/5').text).to.equal('edited online');
      });

      it('leaving the entry within the debounce window still saves the edit', async () => {
        await seedEntry(seeded);
        mockSyncEntries();
        mockUpdateEntry(5);
        await bootApp();

        await click('a[href="/entry/5"]');
        await typeEntry('edited then left');
        await goBack();                          // at once, far inside the 500ms debounce
        await env.findBySelector('a[href="/entry/5"]');

        expect(env.host.querySelector('#et'), 'back on the list').to.not.exist;
        // Deliberately not waited for: leaving the screen must already have sent it.
        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired on the way out').to.be.true;
        expect(lastBody('/api/entry/5').text).to.equal('edited then left');
      });
    });

    describe('offline — write half', () => {
      it('persists the edit to IDB as unsent after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        await click('a[href="/entry/5"]');
        await typeEntry('edited offline');
        await waitFor(() => expect(sent('PATCH'), 'PATCH attempted').to.be.true);
        await networkIdle(); // let it fail

        const stored = await idbGet('entries_99');
        expect(stored.length).to.equal(1);
        expect(stored[0].text).to.equal('edited offline');
        expect(stored[0].needsSync, 'unsent').to.be.ok;
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

        await waitFor(() => expect(fetchMock.called('/api/entry/5', 'PATCH'), 'queued PATCH replayed').to.be.true);
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

        await click('a[href="/entry/5"]');
        await clickHeaderButton('Delete entry');
        await env.findByText('Delete this entry?'); // the confirm modal
        await clickText('Delete');

        await waitFor(() => expect(fetchMock.called('/api/entry/5', 'DELETE'), 'DELETE fired').to.be.true);
        await env.findByText("It's empty in here!"); // back on the list
        expect(env.queryByText('will be gone'), 'row gone from list').to.be.null;
      });
    });

    describe('offline — write half', () => {
      it('marks the entry deleted in IDB after DELETE fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        await click('a[href="/entry/5"]');
        await clickHeaderButton('Delete entry');
        await env.findByText('Delete this entry?');
        await clickText('Delete');
        await waitFor(() => expect(sent('DELETE'), 'DELETE attempted').to.be.true);
        await networkIdle(); // let it fail

        const stored = await idbGet('entries_99');
        // Splice only happens on DELETE success; offline keeps the row with
        // deleted: true so the next online boot can replay it.
        expect(stored.length).to.equal(1);
        expect(stored[0].deleted, 'deleted flag set').to.be.true;
        expect(stored[0].needsSync, 'unsent').to.be.ok;
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

        await waitFor(() => expect(fetchMock.called('/api/entry/5', 'DELETE'), 'queued DELETE replayed').to.be.true);
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

        await click('a[href="/entry/5"]');
        await clickHeaderButton('Toggle favorite');

        await waitFor(() => expect(within(env.getByRole('banner')).getByRole('button', { name: 'Toggle favorite' }).getAttribute('icon'), 'star is now filled').to.equal('star-filled'));
        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true;
        expect(lastBody('/api/entry/5')).to.include({ favorited: true });
      });
    });

    describe('offline — write half', () => {
      it('persists the favorite toggle to IDB as unsent after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        await click('a[href="/entry/5"]');
        await clickHeaderButton('Toggle favorite');
        await waitFor(() => expect(sent('PATCH'), 'PATCH attempted').to.be.true);
        await networkIdle(); // let it fail

        const stored = await idbGet('entries_99');
        expect(stored[0].favorited).to.be.true;
        expect(stored[0].needsSync, 'unsent').to.be.ok;
      });
    });

    describe('offline — replay half', () => {
      it('replays the queued favorite toggle on boot', async () => {
        await idbSet('entries_99', [{
          ...seeded, favorited: true, needsSync: true
        }]);
        localStorage.setItem('timestamp_99', '1000');

        mockSyncEntries();
        mockUpdateEntry(5);

        await bootApp();
        await waitFor(() => expect(fetchMock.called('/api/entry/5', 'PATCH'), 'queued PATCH replayed').to.be.true);

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

      await waitFor(() => expect(env.host.querySelectorAll('.entry-preview').length).to.equal(2));

      await click('a[href="/search"]');

      // /search with no filter shows the Favorites / On this day menu.
      await env.findByText('Favorites');
      expect(env.host.querySelectorAll('.entry-preview').length).to.equal(0);

      fireEvent.input(await env.findBySelector('#fi'), 'beach');

      await waitFor(() => expect(env.host.querySelectorAll('.entry-preview').length).to.equal(1));
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

      await env.findByText('Login');

      fireEvent.input(env.host.querySelector('#luser'), 'alice');
      fireEvent.input(env.host.querySelector('#lpass'), 'pass1');
      fireEvent.submit(env.getByRole('form'));

      // login → loginSuccess → activateAccount → IDB get → getEntries → render
      await env.findBySelector('a[href="/entry/11"]');

      expect(fetchMock.called('/api/user/login', 'POST')).to.be.true;

      const accounts = JSON.parse(localStorage.getItem('accounts'));
      expect(accounts).to.have.length(1);
      expect(accounts[0].id).to.equal(99);
      expect(accounts[0].active).to.be.true;
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

      await env.findBySelector('a[href="/entry/11"]'); // alice's entry
      fireEvent.click(env.getByRole('button', { name: 'Menu' }));
      await clickText('Switch');

      await env.findBySelector('a[href="/entry/22"]'); // bob's entry
      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry gone').to.not.exist;

      const accounts = JSON.parse(localStorage.getItem('accounts'));
      expect(accounts.find(a => a.id === 2).active).to.be.true;
      expect(accounts.find(a => a.id === 1).active).to.be.false;
    });
  });

  describe('logout', () => {
    const storedAccounts = () => JSON.parse(localStorage.getItem('accounts') || '[]');
    const logOut = async () => {
      await clickButton('Menu');
      await clickText('Logout');            // closes the menu, then opens the confirm dialog
      // The menu's "Logout" is on screen until the next frame, so wait for the dialog itself.
      await env.findByText('Logout?');
      fireEvent.click(env.getByRole('button', { name: 'Logout' }));
    };

    it('logging out the only account lands on the login page and forgets the account', async () => {
      mockGetAllEntries({ entries: [] });
      mockLogout();
      await bootApp();

      await logOut();

      await env.findByText('Login');
      expect(fetchMock.called('/api/user/logout', 'POST'), 'logout POST fired').to.be.true;
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
      await env.findBySelector('a[href="/entry/11"]'); // alice's entry

      await logOut();

      await env.findBySelector('a[href="/entry/22"]'); // bob's entry
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

      await env.findByText('Login');
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

      await env.findBySelector('a[href="/entry/22"]'); // bob's entry
      const accounts = storedAccounts();
      expect(accounts.find(a => a.id === 1)).to.include({ expired: true, active: false });
      expect(accounts.find(a => a.id === 2).active).to.be.true;
    });
  });
});
