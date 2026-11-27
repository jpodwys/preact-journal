import fetchMock from 'fetch-mock';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { app, viewEntries, selected } from '../app-state';
import { handleRouteChange } from './global-actions';
import {
  loadAccount,
  editEntry,
  showConfirmDeleteEntryModal,
  deleteEntry,
  newEntry,
  filterByText,
  shiftEntry,
  toggleSort,
  clearFilters,
  exportEntries
} from './entry-actions';
import { refresh } from '../sync';
import { mockGetAllEntries, mockSyncEntries, mockDeleteEntry } from '../../../test/api-mocks';
import {
  resetAll, seed, preserveLocation, settleNetwork, eventually, tick, ACCOUNT_1
} from './spec-helpers';

const ids = list => list.map(e => e.id);

describe('entryActions', () => {
  preserveLocation();

  // Logged in as user '1' with no timestamp and no entries.
  beforeEach(() => resetAll({ accounts: [ACCOUNT_1] }));
  afterEach(() => fetchMock.restore());

  describe('loadAccount', () => {

    it('should set entries as stored; the view (not the store) puts them newest first', async () => {
      mockGetAllEntries();
      await idbSet('entries_1', [
        { id: 1, date: '2017-01-01', text: 'a' },
        { id: 2, date: '2018-01-01', text: 'b' }
      ]);
      await loadAccount('1');
      expect(ids(app.entries)).to.deep.equal([1, 2]);
      expect(ids(viewEntries())).to.deep.equal([2, 1]);
    });

    it('should fetch entries from the server after setting the cached ones', async () => {
      mockGetAllEntries({ entries: [{ id: 3, date: '2019-01-01', text: 'c' }], timestamp: 9 });
      await idbSet('entries_1', [{ id: 1, date: '2017-01-01', text: 'a' }]);
      await loadAccount('1');
      await settleNetwork();
      expect(ids(app.entries)).to.have.members([1, 3]);
      expect(ids(viewEntries())).to.deep.equal([3, 1]);
      expect(app.timestamp).to.equal(9);
    });

    it('at boot (no extra) should keep what was added while the read was in flight', async () => {
      mockGetAllEntries();
      await idbSet('entries_1', [{ id: 1, date: '2017-01-01', text: 'cached' }]);
      const loading = loadAccount('1');
      app.entries = [{ id: 9, date: '2018-01-01', text: 'added during the read' }];
      await loading;
      expect(ids(app.entries)).to.deep.equal([9, 1]);
    });

    it('on a switch (with extra) should replace the list, not add to it', async () => {
      mockGetAllEntries();
      await idbSet('entries_1', [{ id: 1, date: '2017-01-01', text: 'cached' }]);
      app.userId = '2';
      app.entries = [{ id: 9, date: '2018-01-01', text: 'the previous account' }];
      await loadAccount('1', { userId: '1' });
      expect(ids(app.entries)).to.deep.equal([1]);
    });

    it('should write the extra state in the same update as the entries', async () => {
      mockGetAllEntries();
      await idbSet('entries_1', [{ id: 1, date: '2017-01-01', text: 'a' }]);
      await loadAccount('1', { filter: 'favorites' });
      expect(app.filter).to.equal('favorites');
      expect(ids(app.entries)).to.deep.equal([1]);
    });

  });

  describe('showConfirmDeleteEntryModal', () => {

    it('should select the entry and set dialogMode', () => {
      const entry = { id: 4 };
      seed({ entries: [entry] });
      showConfirmDeleteEntryModal({ entry });
      expect(selected()[0]).to.equal(entry);
      expect(app.dialogMode).to.equal('modal:delete');
    });

  });

  describe('editEntry', () => {
    beforeEach(() => seed({ entries: [{ id: 0, date: '2018-01-01', text: 'a' }] }));

    it('should apply the change and count it as unsent', () => {
      expect(editEntry(0, { text: 'b' })).to.be.true;
      expect(app.entries[0]).to.deep.equal({ id: 0, date: '2018-01-01', text: 'b', needsSync: 1 });
      editEntry(0, { text: 'a' });
      expect(app.entries[0].needsSync).to.equal(2);
    });

    it('should do nothing without a change or an entry', () => {
      const before = app.entries;
      expect(editEntry(0, { text: 'a' })).to.be.false;
      expect(editEntry(1, { text: 'b' })).to.be.false;
      expect(app.entries).to.equal(before);
    });

    it('keeps the entry on screen when an edit stops it matching the filters', () => {
      seed({ view: '/entry', filterText: 'a', entry: app.entries[0] });
      editEntry(0, { text: 'z' });
      expect(viewEntries().length).to.equal(0);
      expect(selected()[0].text).to.equal('z');
    });
  });

  describe('deleteEntry', () => {
    beforeEach(() => {
      const entry = { id: 0, date: '2018-01-01', text: 'doomed' };
      seed({ view: '/entry', entry, entries: [entry], dialogMode: 'modal:delete' });
      mockDeleteEntry(0, { httpStatus: 500 });
    });

    it('should leave a tombstone, close the dialog and route to /entries', () => {
      deleteEntry({ id: 0 });
      expect(selected()[0]).to.be.undefined;
      expect(app.dialogMode).to.equal('');
      expect(app.entries[0]).to.include({ deleted: true, text: '' });
      expect(viewEntries()).to.deep.equal([]);
      expect(location.pathname).to.equal('/entries');
    });

    it('should do nothing when no entry has the id', () => {
      const before = app.entries;
      deleteEntry({ id: 1 });
      deleteEntry({});
      expect(app.entries).to.equal(before);
      expect(app.dialogMode).to.equal('modal:delete');
    });
  });

  describe('selected (the entry on screen is stored as an id)', () => {

    it('should find nothing for an id that is not in the list, and the entry once it arrives', () => {
      app.entryId = 1;   // a deep link before the entries are loaded
      expect(selected()).to.deep.equal([undefined, -1]);

      seed({ entries: [{ id: 1, date: '2020-01-01', text: 'a' }] });
      expect(selected()[0]).to.equal(app.entries[0]);
      expect(selected()[1]).to.equal(0);
    });

    // The two lists order differently (the view is sorted by date), which tells them apart.
    it('should index an entry in app.entries when view is /new', () => {
      seed({
        view: '/new',
        entries: [ { id: 1, date: '2020-01-02', text: '' }, { id: 0, date: '2020-01-03', text: '' } ]
      });
      expect(viewEntries().map(e => e.id)).to.deep.equal([0, 1]);
      app.entryId = 0;
      expect(selected()[0]).to.equal(app.entries[1]);
      expect(selected()[1]).to.equal(1);
    });

    it('should not select a deleted entry', () => {
      seed({ view: '/entry', entries: [{ id: 0, date: '2020-01-03', text: '', deleted: true }] });
      app.entryId = 0;
      expect(selected()[0]).to.be.undefined;
    });

    it('should index an entry in viewEntries() when view is not /new (indexes are the view\'s)', () => {
      seed({
        view: '/entries',
        entries: [
          { id: 0, date: '2020-01-03', text: '', deleted: true },
          { id: 1, date: '2020-01-02', text: '' },
          { id: 2, date: '2020-01-01', text: '' }
        ]
      });
      app.entryId = 2;
      expect(selected()[0]).to.equal(viewEntries()[1]);
      expect(selected()[1]).to.equal(1);    // index 1 in the view, index 2 in app.entries
    });

  });

  describe('newEntry', () => {

    it('should create a blank entry, put it first in entries, and select it', () => {
      seed({ view: '/new', entries: [{ id: 0, date: '2000-01-01', text: 'old' }] });
      const start = Date.now();

      newEntry();
      const entry = selected()[0];
      expect(entry.text).to.equal('');
      expect(entry).to.include({ newEntry: true, needsSync: 1 });
      expect(entry).to.not.have.property('slideIn');
      expect(app.fresh).to.deep.equal([entry.id]);
      expect(entry.id).to.be.at.least(start);
      expect(entry.date).to.equal(new Date().toLocaleDateString('en-CA'));
      expect(app.entries[0]).to.equal(entry);
      expect(app.entries[1].id).to.equal(0);
      // what the old `.set` callback did
      expect(selected()[1]).to.equal(0);
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

    it('newEntry marks only the new entry fresh; the mark waits for the list, then clears 450ms after the list shows it', () => {
      fake();
      seed({ view: '/new', entries: [{ id: 0, date: '2000-01-01', text: 'old' }] });
      newEntry();
      expect(app.fresh).to.deep.equal([selected()[0].id]);
      clock.tick(60000);                     // however long the user spends writing, the row has not been on screen yet
      expect(app.fresh).to.deep.equal([selected()[0].id]);
      handleRouteChange('/entries');         // back on the list
      clock.tick(449);
      expect(app.fresh.length).to.equal(1);
      clock.tick(1);
      expect(app.fresh).to.deep.equal([]);
    });

    it('a second mark restarts the window: the first timer must not clear the second batch early', () => {
      fake();
      seed({ view: '/entries', entries: [] });
      newEntry();
      clock.tick(300);
      app.entryId = undefined;
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
      seed({ view: '/entries', timestamp: 1234, entries: [ { id: 0, date: '2019-01-01', text: 'x' }, { id: 1, date: '2015-01-01', text: 'y' } ] });
      refresh();
      await settleNetwork();
      expect(app.fresh).to.deep.equal([2, 3]);
      await tick(480);
      expect(app.fresh).to.deep.equal([]);
    });

    it('a sync that adds nothing leaves fresh alone', async () => {
      mockSyncEntries({ entries: [{ id: 1, date: '2018-01-01', text: 'updated' }], timestamp: 4321 });
      seed({ timestamp: 1234, entries: [{ id: 1, date: '2015-01-01', text: 'y' }] });
      refresh();
      await settleNetwork();
      expect(app.fresh).to.deep.equal([]);
    });
  });

});
