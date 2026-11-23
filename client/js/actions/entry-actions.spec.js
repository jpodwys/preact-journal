import fetchMock from 'fetch-mock';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { app, viewEntries } from '../app-state';
import {
  boot,
  getEntries,
  resetDataFetched,
  createEntry,
  updateEntry,
  showConfirmDeleteEntryModal,
  deleteEntry,
  setEntry,
  newEntry,
  filterByText,
  shiftEntry,
  toggleFavorite,
  toggleSort,
  clearFilters,
  exportEntries
} from './entry-actions';
import {
  mockGetAllEntries,
  mockSyncEntries,
  mockCreateEntry,
  mockUpdateEntry,
  mockDeleteEntry,
  lastBody
} from '../../../test/api-mocks';
import {
  resetAll, seed, preserveLocation, settleNetwork, eventually, tick, ACCOUNT_1
} from './spec-helpers';

const ids = list => list.map(e => e.id);

describe('entryActions', () => {
  preserveLocation();

  // Logged in as user '1' with no timestamp and no entries.
  beforeEach(() => resetAll({ accounts: [ACCOUNT_1] }));
  afterEach(() => fetchMock.restore());

  // Switch accounts mid-request: the response's userId ('1', read from the
  // active account when the request went out) no longer matches the store.
  const switchToOtherUser = () => { app.userId = '2'; };

  describe('boot', () => {

    it('should set entries as given; the view (not the store) puts them newest first', () => {
      mockGetAllEntries();
      const entries = [
        { id: 1, date: '2017-01-01', text: 'a' },
        { id: 2, date: '2018-01-01', text: 'b' }
      ];
      boot({ entries });
      expect(ids(app.entries)).to.deep.equal([1, 2]);
      expect(ids(viewEntries())).to.deep.equal([2, 1]);
    });

    it('should fetch entries from the server after setting the cached ones', async () => {
      mockGetAllEntries({ entries: [{ id: 3, date: '2019-01-01', text: 'c' }], timestamp: 9 });
      boot({ entries: [{ id: 1, date: '2017-01-01', text: 'a' }] });
      await settleNetwork();
      expect(ids(app.entries)).to.have.members([1, 3]);
      expect(ids(viewEntries())).to.deep.equal([3, 1]);
      expect(app.timestamp).to.equal(9);
    });

    it('should re-run the route handler when booting on /entry/:id', () => {
      mockGetAllEntries();
      history.replaceState(null, null, '/entry/2');
      seed({ view: '/entry' });
      boot({ entries: [
        { id: 1, date: '2017-01-01', text: 'a' },
        { id: 2, date: '2018-01-01', text: 'b' }
      ] });
      expect(app.entry.id).to.equal(2);
      expect(app.entryIndex).to.equal(0);
    });

  });

  describe('resetDataFetched', () => {

    it('should allow getEntries to fetch again after being called', async () => {
      mockGetAllEntries({ entries: [], timestamp: 1 });
      getEntries();
      await settleNetwork();
      expect(fetchMock.calls('/api/entries').length).to.equal(1);

      // Second call should be a no-op (dataFetched is true). Clear the
      // timestamp the first fetch wrote so every call would be a full fetch.
      app.timestamp = undefined;
      getEntries();
      await settleNetwork();
      expect(fetchMock.calls('/api/entries').length).to.equal(1);

      app.timestamp = undefined;
      resetDataFetched();
      getEntries();
      await settleNetwork();
      expect(fetchMock.calls('/api/entries').length).to.equal(2);
    });

  });

  describe('getEntries', () => {

    it('should do nothing while logged out', async () => {
      await resetAll();
      mockGetAllEntries();
      getEntries();
      await settleNetwork();
      expect(fetchMock.called()).to.be.false;
    });

    it('should reset the dataFetched flag while logged out, so the next logged-in call fetches', async () => {
      mockGetAllEntries();
      getEntries();
      await settleNetwork();
      app.timestamp = undefined;
      app.loggedIn = false;
      getEntries();
      app.loggedIn = true;
      getEntries();
      await settleNetwork();
      expect(fetchMock.calls('/api/entries').length).to.equal(2);
    });

    it('should do nothing on the second call (when the private dataFetched variable is true)', async () => {
      mockGetAllEntries({ entries: [{ id: 0, date: '2018-01-01', text: 'x' }] });
      getEntries();
      getEntries();
      await settleNetwork();
      expect(fetchMock.calls().length).to.equal(1);
      expect(app.entries.length).to.equal(1);
    });

    it('should fetch entries and timestamp when timestamp is undefined', async () => {
      mockGetAllEntries({
        entries: [ { id: 0, date: '2018-01-01', text: 'bogus' } ],
        timestamp: 1234
      });
      getEntries();
      await settleNetwork();
      expect(ids(app.entries)).to.deep.equal([0]);
      expect(app.timestamp).to.equal(1234);
      // watchers persist both
      expect(localStorage.getItem('timestamp_1')).to.equal('1234');
      await eventually(async () => expect(ids(await idbGet('entries_1'))).to.deep.equal([0]));
    });

    it('should leave state alone when fetching entries fails and timestamp is undefined', async () => {
      mockGetAllEntries({ httpStatus: 500 });
      const before = app.entries;
      getEntries();
      await settleNetwork();
      expect(app.entries).to.equal(before);
      expect(app.timestamp).to.be.undefined;
    });

    it('should write a stale user\'s full fetch to that user\'s IDB cache and timestamp, not the store', async () => {
      await idbSet('entries_1', [{ id: 5, date: '2016-01-01', text: 'cached' }]);
      mockGetAllEntries({ entries: [{ id: 6, date: '2019-01-01', text: 'new' }], timestamp: 77 });
      getEntries();
      switchToOtherUser();
      await settleNetwork();
      expect(app.entries).to.deep.equal([]);
      expect(app.timestamp).to.be.undefined;
      expect(localStorage.getItem('timestamp_1')).to.equal('77');
      await eventually(async () => expect(ids(await idbGet('entries_1'))).to.have.members([5, 6]));
    });

    it('should sync entries from the server to the client when there is a timestamp', async () => {
      mockSyncEntries({
        entries: [ { id: 0, deleted: 1 }, { id: 1, date: '2018-01-01', text: 'b' }, { id: 2, date: '2017-01-01', text: 'c' } ],
        timestamp: 4321
      });
      seed({ timestamp: 1234, entries: [ { id: 0, date: '2019-01-01', text: 'x' }, { id: 1, date: '2015-01-01', text: 'y' } ] });
      getEntries();
      await settleNetwork();
      expect(fetchMock.lastUrl()).to.equal('/api/entries/sync/1234');
      // The store keeps arrival order (a new entry is unshifted); the view sorts for display.
      expect(ids(app.entries)).to.deep.equal([2, 1]);
      expect(ids(viewEntries())).to.deep.equal([1, 2]);
      expect(app.entries.find(e => e.id === 1).date).to.equal('2018-01-01');   // replaced in place
      expect(app.entries.find(e => e.id === 2).date).to.equal('2017-01-01');
      expect(app.entries.find(e => e.id === 2)).to.not.have.property('slideIn');   // the flag no longer lives on entries
      expect(app.fresh).to.deep.equal([2]);                     // only the one that is new from the server slides in
      expect(app.timestamp).to.equal(4321);
    });

    it('should set only the new timestamp when the sync response contains no entries', async () => {
      mockSyncEntries({ entries: [], timestamp: 4321 });
      seed({ timestamp: 1234, entries: [{ id: 0, date: '2019-01-01', text: 'x' }] });
      const before = app.entries;
      getEntries();
      await settleNetwork();
      expect(app.timestamp).to.equal(4321);
      expect(app.entries).to.equal(before);
    });

    it('should leave state alone when syncing entries fails', async () => {
      mockSyncEntries({ httpStatus: 500 });
      seed({ timestamp: 1234, entries: [{ id: 0, date: '2019-01-01', text: 'x' }] });
      const before = app.entries;
      getEntries();
      await settleNetwork();
      expect(app.timestamp).to.equal(1234);
      expect(app.entries).to.equal(before);
    });

    it('should apply a stale user\'s sync to that user\'s IDB cache and timestamp, not the store', async () => {
      seed({ timestamp: 1234, entries: [
        { id: 0, date: '2019-01-01', text: 'gone' },
        { id: 1, date: '2015-01-01', text: 'old' }
      ] });
      await eventually(async () => expect((await idbGet('entries_1')).length).to.equal(2));
      mockSyncEntries({
        entries: [ { id: 0, deleted: 1 }, { id: 1, date: '2015-01-01', text: 'edited' }, { id: 2, date: '2017-01-01', text: 'new' }, { id: 3, deleted: 1 } ],
        timestamp: 4321
      });
      getEntries();
      switchToOtherUser();
      await settleNetwork();
      expect(app.timestamp).to.equal(1234);
      expect(ids(app.entries)).to.deep.equal([0, 1]);
      expect(localStorage.getItem('timestamp_1')).to.equal('4321');
      await eventually(async () => {
        const cached = await idbGet('entries_1');
        expect(ids(cached)).to.have.members([1, 2]);
        expect(cached.find(e => e.id === 1).text).to.equal('edited');
      });
    });

    it('should sync entries from the client to the server when one or more entries has the needsSync flag', async () => {
      mockSyncEntries({ entries: [], timestamp: 4321 });
      mockCreateEntry({ id: 3 });
      mockUpdateEntry(1);
      mockDeleteEntry(2);
      seed({ view: '/entries', timestamp: 1234, entries: [
        { id: 0, date: '2018-01-01', text: 'bogus', newEntry: true, needsSync: true },
        { id: 1, date: '2017-01-01', text: 'what', needsSync: true },
        { id: 2, date: '2016-01-01', text: '', deleted: true, needsSync: true }
      ] });
      getEntries();
      await settleNetwork();

      expect(lastBody('/api/entry')).to.deep.equal({ date: '2018-01-01', text: 'bogus' });
      expect(lastBody('/api/entry/1')).to.include({ id: 1, text: 'what' });
      expect(fetchMock.called('/api/entry/2')).to.be.true;

      expect(app.entries.length).to.equal(2);
      expect(app.entries[0].id).to.equal(3);
      expect(app.entries[0].newEntry).to.be.undefined;
      expect(app.entries[0].needsSync).to.be.undefined;
      expect(app.entries[0].postPending).to.be.undefined;
      expect(app.entries[1].id).to.equal(1);
      expect(app.entries[1].needsSync).to.be.undefined;
    });

    // Replaying the offline queue at boot must not act like the user just
    // deleted/created something: no navigation, no change to the open entry.
    it('should replay a pending delete without navigating away from or clearing the open entry', async () => {
      mockSyncEntries({ entries: [], timestamp: 4321 });
      mockDeleteEntry(2);
      history.replaceState(null, null, '/entry/1');
      const open = { id: 1, date: '2018-01-01', text: 'reading this' };
      seed({ view: '/entry', timestamp: 1234, entry: open, dialogMode: 'menu', entries: [
        open,
        { id: 2, date: '2017-01-01', text: '', deleted: true, needsSync: true }
      ] });
      getEntries();
      expect(location.pathname).to.equal('/entry/1');
      expect(app.entry).to.equal(open);
      expect(app.dialogMode).to.equal('menu');

      await settleNetwork();
      expect(fetchMock.called('/api/entry/2')).to.be.true;
      expect(ids(app.entries)).to.deep.equal([1]);
      expect(app.entry).to.equal(open);
    });

    it('should replay a pending create without selecting it', async () => {
      mockSyncEntries({ entries: [], timestamp: 4321 });
      mockCreateEntry({ id: 3 });
      const open = { id: 1, date: '2018-01-01', text: 'reading this' };
      seed({ view: '/entries', timestamp: 1234, entry: open, entries: [
        open,
        { id: 0, date: '2017-01-01', text: 'offline', newEntry: true, needsSync: true }
      ] });
      getEntries();
      expect(app.entry).to.equal(open);
      expect(app.entries[1].postPending).to.be.true;

      await settleNetwork();
      expect(app.entry).to.equal(open);
      expect(ids(app.entries)).to.deep.equal([1, 3]);
    });

    it('should keep needsSync when updating an entry from client to server fails', async () => {
      mockSyncEntries({ entries: [], timestamp: 4321 });
      mockUpdateEntry(0, { httpStatus: 500 });
      seed({ timestamp: 1234, entries: [ { id: 0, date: '2017-01-01', text: 'what', needsSync: true } ] });
      getEntries();
      await settleNetwork();
      expect(app.entries[0].needsSync).to.be.true;
      expect(app.timestamp).to.equal(4321);
    });

  });

  describe('createEntry', () => {
    const blank = () => ({ id: 0, date: '2018-01-01', text: '', needsSync: true, newEntry: true });

    beforeEach(() => {
      const entry = blank();
      seed({ entry, entries: [entry] });
    });

    it('should do nothing when entry is missing, or entry.id is missing or is not a number, or the provided id is not found', async () => {
      mockCreateEntry();
      const before = { entry: app.entry, entries: app.entries };
      createEntry({});
      createEntry({ entry: {} });
      createEntry({ entry: { id: '0' } });
      createEntry({ entry: { id: 1 } });
      expect(app.entry).to.equal(before.entry);
      expect(app.entries).to.equal(before.entries);
      await settleNetwork();
      expect(fetchMock.called()).to.be.false;
    });

    it('should mark postPending and make no network call if !clientSync && postPending', async () => {
      mockCreateEntry({ id: 1 });
      const pending = { ...blank(), text: 'more', postPending: true };
      createEntry({ entry: pending });

      expect(app.entry).to.deep.equal(pending);
      expect(app.entries[0].postPending).to.be.true;
      expect(app.entries[0].text).to.equal('more');
      await settleNetwork();
      expect(fetchMock.called()).to.be.false;
      expect(app.entries[0].id).to.equal(0);
    });

    it('should set postPending, POST, then swap in the server id and clear the flags if !postPending', async () => {
      mockCreateEntry({ id: 1 });
      const entry = { ...blank(), text: 'hello' };
      createEntry({ entry });

      expect(app.entry.postPending).to.be.true;
      expect(app.entries[0].postPending).to.be.true;
      expect(app.entries[0].text).to.equal('hello');
      // new: the caller's object is never mutated (the original set postPending on it)
      expect(entry.postPending).to.be.undefined;

      await settleNetwork();
      expect(lastBody('/api/entry')).to.deep.equal({ date: '2018-01-01', text: 'hello' });
      expect(app.entry.id).to.equal(1);
      expect(app.entry.postPending).to.be.undefined;
      expect(app.entry.newEntry).to.be.undefined;
      expect(app.entry.needsSync).to.be.undefined;
      expect(app.entries[0].id).to.equal(1);
      expect(app.entries[0].postPending).to.be.undefined;
      expect(app.entries[0].newEntry).to.be.undefined;
      expect(app.entries[0].needsSync).to.be.undefined;
    });

    it('should POST even when postPending is set if clientSync is true', async () => {
      mockCreateEntry({ id: 1 });
      const pending = { ...blank(), postPending: true };
      seed({ entry: pending });
      createEntry({ entry: pending, clientSync: true });

      expect(app.entry.postPending).to.be.true;
      expect(app.entries[0].postPending).to.be.true;

      await settleNetwork();
      expect(fetchMock.called('/api/entry')).to.be.true;
      expect(app.entry.id).to.equal(1);
      expect(app.entry.postPending).to.be.undefined;
      expect(app.entry.newEntry).to.be.undefined;
      expect(app.entry.needsSync).to.be.undefined;
      expect(app.entries[0].id).to.equal(1);
      expect(app.entries[0].postPending).to.be.undefined;
      expect(app.entries[0].newEntry).to.be.undefined;
      expect(app.entries[0].needsSync).to.be.undefined;
    });

    it('should clear only postPending when the network call fails', async () => {
      mockCreateEntry({ httpStatus: 500 });
      createEntry({ entry: blank() });
      expect(app.entries[0].postPending).to.be.true;

      await settleNetwork();
      expect(app.entry.id).to.equal(0);
      expect(app.entry.postPending).to.be.undefined;
      expect(app.entry.newEntry).to.be.true;
      expect(app.entry.needsSync).to.be.true;
      expect(app.entries[0].id).to.equal(0);
      expect(app.entries[0].postPending).to.be.undefined;
      expect(app.entries[0].newEntry).to.be.true;
      expect(app.entries[0].needsSync).to.be.true;
    });

    it('should leave a non-active entry\'s app.entry alone when the POST succeeds', async () => {
      mockCreateEntry({ id: 1 });
      const other = { id: 50, date: '2010-01-01', text: 'other' };
      seed({ entry: other, entries: [blank(), other] });
      createEntry({ entry: blank(), clientSync: true });
      seed({ entry: other }); // user navigated elsewhere meanwhile
      await settleNetwork();
      expect(app.entry).to.equal(other);
      expect(ids(app.entries)).to.deep.equal([1, 50]);
    });

    it('should patch the original user\'s IDB cache (not the store) when the user switches before the POST returns', async () => {
      mockCreateEntry({ id: 1 });
      createEntry({ entry: { ...blank(), text: 'hi' } });
      switchToOtherUser();
      await settleNetwork();

      expect(app.entries[0].id).to.equal(0);
      expect(app.entries[0].postPending).to.be.true;
      await eventually(async () => {
        const [cached] = await idbGet('entries_1');
        expect(cached.id).to.equal(1);
        expect(cached.text).to.equal('hi');
        expect(cached.postPending).to.be.undefined;
        expect(cached.newEntry).to.be.undefined;
        expect(cached.needsSync).to.be.undefined;
      });
    });

  });

  describe('updateEntry', () => {

    beforeEach(() => {
      const entry = { id: 0, date: '2018-01-01', text: 'a' };
      seed({ entry, entries: [entry] });
    });

    it('should do nothing when entry, property, or entryId is missing', async () => {
      mockUpdateEntry(0);
      const before = app.entries;
      updateEntry({});
      updateEntry({ entry: { text: 'b' }, entryId: 0 });
      updateEntry({ entry: { text: 'b' }, property: 'text' });
      expect(app.entries).to.equal(before);
      await settleNetwork();
      expect(fetchMock.called()).to.be.false;
    });

    it('should do nothing when no entry with the given id exists', () => {
      const before = app.entries;
      updateEntry({ entry: { date: '2017-01-01' }, property: 'date', entryId: 1 });
      expect(app.entries).to.equal(before);
    });

    it('should do nothing when there was no change', async () => {
      mockUpdateEntry(0);
      const before = app.entries;
      updateEntry({ entry: { date: app.entry.date }, property: 'date', entryId: 0 });
      expect(app.entries).to.equal(before);
      await settleNetwork();
      expect(fetchMock.called()).to.be.false;
    });

    it('should set entry.date, mark the entry for sync, and remove needsSync when the network call succeeds', async () => {
      mockUpdateEntry(0);
      updateEntry({ entry: { date: '2017-01-01' }, property: 'date', entryId: 0 });

      expect(app.entry.date).to.equal('2017-01-01');
      expect(app.entry.needsSync).to.be.true;
      expect(app.entries[0].date).to.equal('2017-01-01');
      expect(app.entries[0].needsSync).to.be.true;

      await settleNetwork();
      expect(lastBody('/api/entry/0')).to.deep.equal({ date: '2017-01-01' });
      expect(app.entry.date).to.equal('2017-01-01');
      expect(app.entry.needsSync).to.be.undefined;
      expect(app.entries[0].date).to.equal('2017-01-01');
      expect(app.entries[0].needsSync).to.be.undefined;
    });

    it('should set entry.text, mark the entry for sync, and remove needsSync when the network call succeeds', async () => {
      mockUpdateEntry(0);
      updateEntry({ entry: { text: 'b' }, property: 'text', entryId: 0 });

      expect(app.entry.text).to.equal('b');
      expect(app.entry.needsSync).to.be.true;
      expect(app.entries[0].text).to.equal('b');
      expect(app.entries[0].needsSync).to.be.true;

      await settleNetwork();
      expect(lastBody('/api/entry/0')).to.deep.equal({ text: 'b' });
      expect(app.entry.text).to.equal('b');
      expect(app.entry.needsSync).to.be.undefined;
      expect(app.entries[0].text).to.equal('b');
      expect(app.entries[0].needsSync).to.be.undefined;
    });

    it('should keep needsSync when the network call fails', async () => {
      mockUpdateEntry(0, { httpStatus: 500 });
      updateEntry({ entry: { text: 'b' }, property: 'text', entryId: 0 });

      expect(app.entry.text).to.equal('b');
      expect(app.entries[0].needsSync).to.be.true;

      await settleNetwork();
      expect(app.entry.needsSync).to.be.true;
      expect(app.entries[0].needsSync).to.be.true;
    });

    it('should reorder the VIEW (not the stored list) after a date change', () => {
      mockUpdateEntry(0);
      const older = { id: 1, date: '2010-01-01', text: 'z' };
      seed({ entries: [app.entries[0], older] });
      const before = app.entries;
      expect(ids(viewEntries())).to.deep.equal([0, 1]);
      updateEntry({ entry: { date: '2000-01-01' }, property: 'date', entryId: 0 });
      expect(ids(viewEntries())).to.deep.equal([1, 0]);
      expect(ids(app.entries)).to.deep.equal([0, 1]);   // the store does not re-sort
      expect(ids(before)).to.deep.equal([0, 1]);        // and never mutates the old array
    });

    // Covers the stale-user branch in applyEntryPatch (shared by all four callers).
    // A real race: the user fires a request and switches accounts before the
    // response lands; the success handler must patch the original user's IDB
    // cache instead of the now-current user's in-memory state.
    it('should patch IDB for the original user (not in-memory state) when the user switches accounts before the response arrives', async () => {
      mockUpdateEntry(0);
      updateEntry({ entry: { date: '2017-01-01' }, property: 'date', entryId: 0 });
      switchToOtherUser();
      await settleNetwork();

      expect(app.entries[0].needsSync).to.be.true;
      await eventually(async () => {
        const [cached] = await idbGet('entries_1');
        expect(cached.date).to.equal('2017-01-01');
        expect(cached.needsSync).to.be.undefined;
      });
    });

  });

  describe('showConfirmDeleteEntryModal', () => {

    it('should set entry and dialogMode', () => {
      const entry = { id: 4 };
      showConfirmDeleteEntryModal({ entry });
      expect(app.entry).to.equal(entry);
      expect(app.dialogMode).to.equal('modal:delete');
    });

  });

  describe('deleteEntry', () => {

    beforeEach(() => {
      const entry = { id: 0, date: '2018-01-01', text: 'doomed' };
      seed({ view: '/entry', entry, entries: [entry], dialogMode: 'modal:delete' });
    });

    it('should do nothing when id is not passed', () => {
      const before = app.entries;
      deleteEntry({});
      deleteEntry({ id: '0' });
      expect(app.entries).to.equal(before);
      expect(app.dialogMode).to.equal('modal:delete');
    });

    it('should do nothing when no entry with the given id exists', () => {
      const before = app.entries;
      deleteEntry({ id: 1 });
      expect(app.entries).to.equal(before);
      expect(app.entry.id).to.equal(0);
    });

    it('should clear entry, mark the entry deleted, route to /entries, and remove the entry when the network call succeeds', async () => {
      mockDeleteEntry(0);
      deleteEntry({ id: 0 });

      expect(app.entry).to.be.undefined;
      expect(app.dialogMode).to.equal('');
      expect(app.entries[0].needsSync).to.be.true;
      expect(app.entries[0].deleted).to.be.true;
      expect(app.entries[0].text).to.equal('');
      expect(viewEntries()).to.deep.equal([]);
      // what the old `.set` callback did
      expect(location.pathname).to.equal('/entries');

      await settleNetwork();
      expect(fetchMock.called('/api/entry/0')).to.be.true;
      expect(app.entries.length).to.equal(0);
    });

    it('should not route when already on /entries', () => {
      mockDeleteEntry(0);
      seed({ view: '/entries' });
      const replaceSpy = sinon.spy(history, 'replaceState');
      try {
        deleteEntry({ id: 0 });
        expect(replaceSpy.called).to.be.false;
      } finally {
        replaceSpy.restore();
      }
    });

    it('should keep the entry marked for deletion when the network call fails', async () => {
      mockDeleteEntry(0, { httpStatus: 500 });
      deleteEntry({ id: 0 });

      expect(app.entry).to.be.undefined;
      expect(app.entries[0].deleted).to.be.true;

      await settleNetwork();
      expect(app.entries.length).to.equal(1);
      expect(app.entries[0].needsSync).to.be.true;
      expect(app.entries[0].deleted).to.be.true;
      expect(app.entries[0].text).to.equal('');
    });

    // Regression test for the applyEntryPatch idx === -1 guard. Also protects
    // updateEntrySuccess, createEntrySuccess, and createEntryFailure.
    it('should not corrupt entries when the target is removed from state before the delete response resolves', async () => {
      mockDeleteEntry(0);
      seed({ entries: [app.entries[0], { id: 99, date: '2010-01-01', text: 'keep' }] });
      deleteEntry({ id: 0 });

      // Without the guard, splice(-1, 1) would remove { id: 99 }.
      const remaining = [{ id: 99, date: '2010-01-01', text: 'keep' }];
      app.entries = remaining;

      await settleNetwork();
      expect(app.entries).to.equal(remaining);
    });

    it('should remove the entry from the original user\'s IDB cache when the user switches before the response', async () => {
      mockDeleteEntry(0);
      seed({ entries: [app.entries[0], { id: 99, date: '2010-01-01', text: 'keep' }] });
      deleteEntry({ id: 0 });
      switchToOtherUser();
      await settleNetwork();

      expect(app.entries.length).to.equal(2);
      await eventually(async () => expect(ids(await idbGet('entries_1'))).to.deep.equal([99]));
    });

  });

  describe('setEntry', () => {

    it('should do nothing when there is no id, id is -1, or there are no entries', () => {
      setEntry({ id: '1' }); // no entries yet
      expect(app.entry).to.be.undefined;

      seed({ entries: [{ id: 1, date: '2020-01-01', text: 'a' }] });
      setEntry({});
      setEntry({ id: -1 });
      expect(app.entry).to.be.undefined;
      expect(app.entryIndex).to.equal(-1);
    });

    // A deleted entry is in app.entries but not in the view, which tells the two lists apart.
    it('should find an entry in app.entries when view is /new (even one the view hides)', () => {
      seed({
        view: '/new',
        entries: [ { id: 0, date: '2020-01-03', text: '', deleted: true }, { id: 1, date: '2020-01-02', text: '' } ]
      });
      expect(viewEntries().map(e => e.id)).to.deep.equal([1]);
      setEntry({ id: '0' });
      expect(app.entry).to.equal(app.entries[0]);
      expect(app.entryIndex).to.equal(0);
    });

    it('should find an entry in viewEntries() when view is not /new (indexes are the view\'s)', () => {
      seed({
        view: '/entries',
        entries: [
          { id: 0, date: '2020-01-03', text: '', deleted: true },
          { id: 1, date: '2020-01-02', text: '' },
          { id: 2, date: '2020-01-01', text: '' }
        ]
      });
      setEntry({ id: '2' });
      expect(app.entry).to.equal(viewEntries()[1]);
      expect(app.entryIndex).to.equal(1);    // index 1 in the view, index 2 in app.entries
    });

  });

  describe('newEntry', () => {

    it('should create a blank entry, put it first in entries, and select it', () => {
      seed({ view: '/new', entries: [{ id: 0, date: '2000-01-01', text: 'old' }] });
      const start = Date.now();

      newEntry();
      const entry = app.entry;
      expect(entry.text).to.equal('');
      expect(entry.needsSync).to.be.true;
      expect(entry.newEntry).to.be.true;
      expect(entry).to.not.have.property('slideIn');
      expect(app.fresh).to.deep.equal([entry.id]);
      expect(entry.id).to.be.at.least(start);
      expect(entry.date).to.equal(new Date().toLocaleDateString('en-CA'));
      expect(app.entries[0]).to.equal(entry);
      expect(app.entries[1].id).to.equal(0);
      // what the old `.set` callback did
      expect(app.entryIndex).to.equal(0);
    });

  });

  describe('filterByText', () => {

    it('should set filterText when appropriate', () => {
      seed({ view: '/search', filterText: 'bogus' });

      filterByText('bogus');
      expect(app.filterText).to.equal('bogus');

      filterByText();
      expect(app.filterText).to.equal('');

      filterByText('one');
      expect(app.filterText).to.equal('one');
    });

    it('recomputes viewEntries from the new query (store watcher)', () => {
      seed({ view: '/search', entries: [
        { id: 1, date: '2020-01-01', text: 'beach day' },
        { id: 2, date: '2020-01-02', text: 'office' }
      ] });
      filterByText('beach');
      expect(ids(viewEntries())).to.deep.equal([1]);
    });

  });

  describe('shiftEntry', () => {
    let replaceSpy;
    beforeEach(() => { replaceSpy = sinon.spy(history, 'replaceState'); });
    afterEach(() => replaceSpy.restore());

    const three = [{ id: 1 }, { id: 2 }, { id: 3 }];

    it('does nothing on views other than /entry', () => {
      seed({ view: '/entries', entry: { id: 1 }, viewEntries: [{ id: 1 }, { id: 2 }] });
      shiftEntry(1);
      expect(replaceSpy.called).to.be.false;
    });

    it('does nothing when count is 0', () => {
      seed({ view: '/entry', entry: { id: 1 }, viewEntries: [{ id: 1 }, { id: 2 }] });
      shiftEntry(0);
      expect(replaceSpy.called).to.be.false;
    });

    it('does nothing when there is no current entry', () => {
      seed({ view: '/entry', entry: undefined, viewEntries: [{ id: 1 }] });
      shiftEntry(1);
      expect(replaceSpy.called).to.be.false;
    });

    it('replaces history with the next entry id when count is 1', () => {
      seed({ view: '/entry', entry: { id: 1 }, viewEntries: three });
      shiftEntry(1);
      expect(replaceSpy.calledOnce).to.be.true;
      expect(replaceSpy.args[0][2]).to.equal('/entry/2');
      expect(location.pathname).to.equal('/entry/2');
    });

    it('replaces history with the prior entry id when count is -1', () => {
      seed({ view: '/entry', entry: { id: 2 }, viewEntries: three });
      shiftEntry(-1);
      expect(replaceSpy.args[0][2]).to.equal('/entry/1');
    });

    it('does not navigate past the end of viewEntries', () => {
      seed({ view: '/entry', entry: { id: 3 }, viewEntries: three });
      shiftEntry(1);
      expect(replaceSpy.called).to.be.false;
    });

    it('does not navigate before the start of viewEntries', () => {
      seed({ view: '/entry', entry: { id: 1 }, viewEntries: three });
      shiftEntry(-1);
      expect(replaceSpy.called).to.be.false;
    });
  });

  describe('toggleFavorite', () => {
    // The success path (clearing needsSync) is covered by the updateEntry tests.
    beforeEach(() => mockUpdateEntry(0));

    it('delegates to updateEntry: marks favorited, sets needsSync, and PATCHes only that field', async () => {
      const entry = { id: 0, date: '2020-01-01', text: 'a', favorited: false };
      seed({ entry, entries: [entry] });

      toggleFavorite({ id: 0, favorited: true });

      expect(app.entry.favorited).to.be.true;
      expect(app.entry.needsSync).to.be.true;
      expect(app.entry.id).to.equal(0);
      expect(app.entries[0].favorited).to.be.true;
      await settleNetwork();
      expect(lastBody('/api/entry/0')).to.deep.equal({ favorited: true });
    });

    // Changed: the original always copied the updated entry into state.entry;
    // now only the entry on screen is mirrored (favoriting from the list, or a
    // late save for an entry the user left, must not select it).
    it('leaves app.entry alone when favoriting an entry that is not the active one', () => {
      const other = { id: 5, date: '2019-01-01', text: 'b' };
      seed({ entry: other, entries: [{ id: 0, date: '2020-01-01', text: 'a', favorited: false }, other] });
      toggleFavorite({ id: 0, favorited: true });
      expect(app.entry).to.equal(other);
      expect(app.entries[0].favorited).to.be.true;
      expect(app.entries[0].needsSync).to.be.true;
    });

    it('does nothing when no entry with that id exists', () => {
      seed({ entries: [{ id: 0, date: '2020-01-01', text: 'a', favorited: false }] });
      const before = app.entries;
      toggleFavorite({ id: 99, favorited: true });
      expect(app.entries).to.equal(before);
      expect(app.entry).to.be.undefined;
    });
  });

  describe('toggleSort', () => {
    it('flips desc to asc and clears dialogMode', () => {
      seed({ sort: 'desc', dialogMode: 'menu' });
      toggleSort();
      expect(app.sort).to.equal('asc');
      expect(app.dialogMode).to.equal('');
    });

    it('flips asc to desc and clears dialogMode', () => {
      seed({ sort: 'asc', dialogMode: 'menu' });
      toggleSort();
      expect(app.sort).to.equal('desc');
      expect(app.dialogMode).to.equal('');
    });

    it('re-orders viewEntries (store watcher)', () => {
      seed({ view: '/entries', entries: [
        { id: 2, date: '2020-01-02', text: 'b' },
        { id: 1, date: '2020-01-01', text: 'a' }
      ] });
      toggleSort();
      expect(ids(viewEntries())).to.deep.equal([1, 2]);
    });
  });

  describe('clearFilters', () => {
    it('clears filter and filterText', () => {
      seed({ filter: 'favorites', filterText: 'beach' });
      clearFilters();
      expect(app.filter).to.equal('');
      expect(app.filterText).to.equal('');
    });
  });

  describe('exportEntries', () => {
    let createObjectURL, revokeObjectURL;
    beforeEach(() => {
      createObjectURL = sinon.stub(window.URL, 'createObjectURL').returns('blob:t');
      revokeObjectURL = sinon.stub(window.URL, 'revokeObjectURL');
    });
    afterEach(() => {
      createObjectURL.restore();
      revokeObjectURL.restore();
    });

    it('hands viewEntries() to the export util and closes the dialog', async () => {
      seed({ dialogMode: 'menu', viewEntries: [{ date: '2024-01-01', text: 'Hello' }] });
      exportEntries();
      expect(createObjectURL.calledOnce).to.be.true;
      const blob = createObjectURL.args[0][0];
      expect(await blob.text()).to.equal('2024-01-01\r\n\r\nHello\r\n\r\n\r\n');
      expect(app.dialogMode).to.equal('');
    });

    it('does nothing when there are no viewEntries to export', () => {
      seed({ viewEntries: [] });
      exportEntries();
      expect(createObjectURL.called).to.be.false;
    });
  });

  describe('fresh rows (slide-in)', () => {
    let clock;
    // Fake only timeouts: a faked requestAnimationFrame left pending would leave the scheduler stuck.
    const fake = () => { clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); };
    afterEach(() => { if(clock) clock.restore(); clock = null; });

    it('newEntry marks only the new entry fresh, then clears it after 450ms', () => {
      fake();
      seed({ view: '/new', entries: [{ id: 0, date: '2000-01-01', text: 'old' }] });
      newEntry();
      expect(app.fresh).to.deep.equal([app.entry.id]);
      clock.tick(449);
      expect(app.fresh.length).to.equal(1);
      clock.tick(1);
      expect(app.fresh).to.deep.equal([]);
    });

    it('a second mark restarts the window: the first timer must not clear the second batch early', () => {
      fake();
      seed({ view: '/new', entries: [] });
      newEntry();
      clock.tick(300);
      app.entry = undefined;
      newEntry();
      clock.tick(300);                       // 600ms after the first mark, 300 after the second
      expect(app.fresh.length, 'second batch still animating').to.equal(1);
      clock.tick(150);
      expect(app.fresh).to.deep.equal([]);
    });

    it('a sync marks every entry that is new from the server (not ones it updated or deleted), then clears them', async () => {
      mockSyncEntries({
        entries: [ { id: 0, deleted: 1 }, { id: 1, date: '2018-01-01', text: 'updated' }, { id: 2, date: '2017-01-01', text: 'new a' }, { id: 3, date: '2016-01-01', text: 'new b' } ],
        timestamp: 4321
      });
      seed({ timestamp: 1234, entries: [ { id: 0, date: '2019-01-01', text: 'x' }, { id: 1, date: '2015-01-01', text: 'y' } ] });
      getEntries();
      await settleNetwork();
      expect(app.fresh).to.deep.equal([2, 3]);
      await tick(480);
      expect(app.fresh).to.deep.equal([]);
    });

    it('a sync that adds nothing leaves fresh alone', async () => {
      mockSyncEntries({ entries: [{ id: 1, date: '2018-01-01', text: 'updated' }], timestamp: 4321 });
      seed({ timestamp: 1234, entries: [{ id: 1, date: '2015-01-01', text: 'y' }] });
      getEntries();
      await settleNetwork();
      expect(app.fresh).to.deep.equal([]);
    });
  });

});
