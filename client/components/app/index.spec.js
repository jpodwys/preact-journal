import { h } from 'preact';
import fetchMock from 'fetch-mock';
import { clear as idbClear, get as idbGet, set as idbSet } from 'idb-keyval';
import { mount, fireEvent } from '../../../test/mount';
import App from './index';
import getInitialState from '../../js/app-state';
import actions from '../../js/actions';
import { saveAccounts } from '../../js/utils';
import {
  mockGetAllEntries,
  mockSyncEntries,
  mockCreateEntry,
  mockUpdateEntry,
  mockDeleteEntry,
  mockLogin,
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
    actions.resetDataFetched();
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
    env = mount(h(App, null), {
      state: getInitialState(),
      actions
    });
    // getInitialState fires 'boot' from an async IDB read; let it resolve.
    await flush();
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

        const entryText = env.host.querySelector('#entryText');
        expect(entryText, 'should land on /new').to.exist;

        entryText.innerText = 'first entry';
        fireEvent.input(entryText);
        await tickDebounce();
        await flush(); // POST resolves → createEntrySuccess clears flags

        expect(fetchMock.called('/api/entry', 'POST'), 'POST fired').to.be.true;
        expect(lastBody('/api/entry').text).to.equal('first entry');

        await new Promise(r => {
          window.addEventListener('popstate', () => r(), { once: true });
          history.back();
        });
        await flush();

        expect(env.queryByText('first entry'), 'entry visible on list').to.exist;
        expect(env.queryByText("It's empty in here!")).to.be.null;
      });
    });

    describe('offline — write half', () => {
      it('persists the queued entry to IDB with needsSync after the POST fails', async () => {
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/new"]'));
        const entryText = env.host.querySelector('#entryText');
        entryText.innerText = 'offline entry';
        fireEvent.input(entryText);
        await tickDebounce();
        await flush();

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

        const entryText = env.host.querySelector('#entryText');
        expect(entryText, 'on entry view').to.exist;

        entryText.innerText = 'edited online';
        fireEvent.input(entryText);
        await tickDebounce();
        await flush();

        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true;
        expect(lastBody('/api/entry/5').text).to.equal('edited online');
      });
    });

    describe('offline — write half', () => {
      it('persists the edit to IDB with needsSync after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        const entryText = env.host.querySelector('#entryText');
        entryText.innerText = 'edited offline';
        fireEvent.input(entryText);
        await tickDebounce();
        await flush();

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
        const deleteIcon = env.host.querySelector('header svg[icon="delete"]');
        expect(deleteIcon, 'delete icon on entry view').to.exist;
        fireEvent.click(deleteIcon);

        expect(env.queryByText('Delete this entry?'), 'confirm modal opened').to.exist;
        fireEvent.click(env.getByText('Delete'));
        await flush();

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
        fireEvent.click(env.host.querySelector('header svg[icon="delete"]'));
        fireEvent.click(env.getByText('Delete'));
        await flush();

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

        const star = env.host.querySelector('header svg[icon="star-empty"]');
        expect(star, 'empty star on entry view').to.exist;
        fireEvent.click(star);
        await flush();

        expect(fetchMock.called('/api/entry/5', 'PATCH'), 'PATCH fired').to.be.true;
        expect(lastBody('/api/entry/5')).to.deep.equal({ favorited: true });
        expect(env.host.querySelector('header svg[icon="star-filled"]'), 'star is now filled').to.exist;
      });
    });

    describe('offline — write half', () => {
      it('persists the favorite toggle to IDB with needsSync after PATCH fails', async () => {
        await seedEntry(seeded);
        mockEntryApiOffline();
        await bootApp();

        fireEvent.click(env.host.querySelector('a[href="/entry/5"]'));
        fireEvent.click(env.host.querySelector('header svg[icon="star-empty"]'));
        await flush();

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

      // /search with no filter shows the Favorites / On this day menu.
      expect(env.queryByText('Favorites')).to.exist;
      expect(env.host.querySelectorAll('.entry-preview').length).to.equal(0);

      const input = env.host.querySelector('#filterTextInput');
      fireEvent.input(input, 'beach');
      await flush(160); // header debounce is 100ms

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
      fireEvent.input(env.host.querySelector('#lpass'), 'pass1');
      fireEvent.submit(env.getByRole('form'));
      // login → loginSuccess → activateAccount → IDB get → setState
      // → getEntries → GET /api/entries. Two flushes cover the chain.
      await flush();
      await flush();

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

      fireEvent.click(env.host.querySelector('header svg[icon="menu"]'));
      fireEvent.click(env.getByText('Switch'));
      // activateAccount → IDB get → setState → getEntries → GET → success
      await flush();
      await flush();

      expect(env.host.querySelector('a[href="/entry/22"]'), 'bob entry visible').to.exist;
      expect(env.host.querySelector('a[href="/entry/11"]'), 'alice entry gone').to.not.exist;

      const accounts = JSON.parse(localStorage.getItem('accounts'));
      expect(accounts.find(a => a.id === 2).active).to.be.true;
      expect(accounts.find(a => a.id === 1).active).to.be.false;
    });
  });
});
