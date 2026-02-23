import { get, set } from 'idb-keyval';
import {
  findObjectIndexById,
  sortObjectsByDate,
  applyFilters,
  getViewFromPathname,
  isActiveEntryId,
  clearData
} from './index';

describe('utils', () => {

  describe('findObjectIndexById', () => {
    const list = [ { id: 0 }, { id: 1 }, { id: 2 } ];

    it('should return -1 when an object with the given id is not found', () => {
      expect(findObjectIndexById(3, list)).to.equal(-1);
    });

    it('should return the index of the object with the provided id', () => {
      expect(findObjectIndexById(1, list)).to.equal(1);
    });
  });

  describe('sortObjectsByDate', () => {
    it('should return an empty array when passed falsey', () => {
      const sorted = sortObjectsByDate();
      expect(Array.isArray(sorted)).to.be.true;
      expect(sorted.length).to.equal(0);
    });

    it('should sort object by descending date when passed only list', () => {
      const list = [ { date: '1' }, { date: '0' }, { date: '2' } ];
      const sorted = sortObjectsByDate(list);
      expect(sorted[0].date).to.equal('2');
      expect(sorted[1].date).to.equal('1');
      expect(sorted[2].date).to.equal('0');
    });

    it('should sort object by descending date when passed list and `desc`', () => {
      const list = [ { date: '1' }, { date: '0' }, { date: '2' } ];
      const sorted = sortObjectsByDate(list, 'desc');
      expect(sorted[0].date).to.equal('2');
      expect(sorted[1].date).to.equal('1');
      expect(sorted[2].date).to.equal('0');
    });

    it('should sort object by descending date when passed list and `asc`', () => {
      const list = [ { date: '1' }, { date: '0' }, { date: '2' } ];
      const sorted = sortObjectsByDate(list, 'asc');
      expect(sorted[0].date).to.equal('0');
      expect(sorted[1].date).to.equal('1');
      expect(sorted[2].date).to.equal('2');
    });
  });

  describe('applyFilters', () => {
    const query = '2019';
    let filter = 'favorites';
    const list = [
      { deleted: '1', text: query },
      { date: '2017', text: '', favorited: true },
      { date: '2018', text: query, favorited: true },
      { date: query, text: '1' }
    ];

    it('should return an empty list when on the /search view and query and filter are falsey', () => {
      const filtered = applyFilters('/search', '', '', 'desc', list);
      expect(filtered.length).to.equal(0);
    });

    it('should return entries containing query (excluding deleted) in descending order', () => {
      const filtered = applyFilters('/search', query, '', 'desc', list);
      expect(filtered[0].date).to.equal(list[3].date);
      expect(filtered[1].date).to.equal(list[2].date);
    });

    it('should return entries containing query (excluding deleted) in ascending order', () => {
      const filtered = applyFilters('/search', query, '', 'asc', list);
      expect(filtered[0].date).to.equal(list[2].date);
      expect(filtered[1].date).to.equal(list[3].date);
    });

    it('should return entries containing query (excluding deleted)', () => {
      const filtered = applyFilters('/search', query, '', 'desc', list);
      expect(filtered.length).to.equal(2);
      expect(filtered[0].date).to.equal(list[3].date);
      expect(filtered[1].date).to.equal(list[2].date);
    });

    it('should return favorited entries (excluding deleted)', () => {
      const filtered = applyFilters('/search', '', filter, 'desc', list);
      expect(filtered.length).to.equal(2);
      expect(filtered[0].date).to.equal(list[2].date);
      expect(filtered[1].date).to.equal(list[1].date);
    });

    it('should return favorited entries containing query (excluding deleted)', () => {
      const filtered = applyFilters('/search', query, filter, 'desc', list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].text).to.equal(query);
    });
  });

  describe('getViewFromPathname', () => {
    const rootHref = '/';
    const newHref = '/entry/new';
    const entriesHref = '/entries'
    const entryHref = '/entry/1234'

    it('should return /new if href contains /new', () => {
      expect(getViewFromPathname(newHref)).to.equal('/new');
    });

    it('should return /entry when passed /entry/1234', () => {
      expect(getViewFromPathname(entryHref)).to.equal('/entry');
    });

    it('should return /entries when passed /entries', () => {
      expect(getViewFromPathname(entriesHref)).to.equal('/entries');
    });

    it('should return / when passed /', () => {
      expect(getViewFromPathname(rootHref)).to.equal('/');
    });

    it('should return /switch when passed /switch', () => {
      expect(getViewFromPathname('/switch')).to.equal('/switch');
    });
  });

  describe('isActiveEntryId', () => {
    let el;

    beforeEach(() => {
      el = {
        state: {}
      };
    });

    it('should return false when entry is undefined', () => {
      expect(isActiveEntryId(el, 0)).to.be.false;
    });

    it('should return false when the given ids don\'t match', () => {
      el.state.entry = { id: 1 };
      expect(isActiveEntryId(el, 0)).to.be.false;
    });

    it('should return true when the given ids match', () => {
      el.state.entry = { id: 0 };
      expect(isActiveEntryId(el, 0)).to.be.true;
    });

  });

  describe('clearData', () => {
    it('should clear indexedDB and localStorage', async () => {
      localStorage.setItem('bogus', 'value');
      await set('bogus', 'value');
      clearData();
      const value = await get('bogus');
      expect(value).to.be.undefined;
      expect(localStorage.getItem('bogus')).to.be.null;
    });

    it('should only clear the specified user data when userId is provided', async () => {
      localStorage.setItem('timestamp_42', '1234');
      localStorage.setItem('timestamp_99', '5678');
      await set('entries_42', [{ id: 1 }]);
      await set('entries_99', [{ id: 2 }]);

      clearData('42');

      expect(localStorage.getItem('timestamp_42')).to.be.null;
      expect(localStorage.getItem('timestamp_99')).to.equal('5678');
      const cleared = await get('entries_42');
      const kept = await get('entries_99');
      expect(cleared).to.be.undefined;
      expect(kept).to.deep.equal([{ id: 2 }]);
    });
  });

});
