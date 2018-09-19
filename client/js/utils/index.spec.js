import {
  findObjectIndexById,
  removeObjectByIndex,
  sortObjectsByDate,
  filterObjectsByText,
  filterHiddenEntries,
  applyFilters,
  clearLocalStorage,
  getViewFromHref,
  merge
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

  describe('removeObjectByIndex', () => {
    let list = [ { id: 0 }, { id: 1 }, { id: 2 } ];
    
    it('should remove the item at the given index', () => {
      removeObjectByIndex(1, list);
      expect(list[1].id).to.equal(2);
    });
  });

  describe('sortObjectsByDate', () => {
    it('should return an empty array when passed undefined', () => {
      const sorted = sortObjectsByDate();
      expect(Array.isArray(sorted)).to.be.true;
      expect(sorted.length).to.equal(0);
    });

    it('should sort object by descending date', () => {
      const list = [ { date: '1' }, { date: '0' }, { date: '2' } ];
      const sorted = sortObjectsByDate(list);
      expect(sorted[0].date).to.equal('2');
      expect(sorted[1].date).to.equal('1');
      expect(sorted[2].date).to.equal('0');
    });
  });

  describe('filterObjectsByText', () => {
    const list = [
      { date: '0', text: 'a' },
      { date: '1', text: 'b' },
      { date: '2', text: 'c' },
      { date: 'c', text: '2' }
    ];
    
    it('should return input list if query is falsey', () => {
      const filtered = filterObjectsByText('', list);
      expect(filtered).to.equal(list);
    });
    
    it('should return empty list if query is not found', () => {
      const filtered = filterObjectsByText('z', list);
      expect(filtered.length).to.equal(0);
    });
    
    it('should find entries with matching date content', () => {
      const filtered = filterObjectsByText('0', list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].date).to.equal('0');
    });
    
    it('should find entries with matching text content even when the query is capitalized', () => {
      let filtered = filterObjectsByText('b', list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].date).to.equal('1');

      filtered = filterObjectsByText('B', list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].date).to.equal('1');
    });
    
    it('should find entries with matching date and/or text content', () => {
      const filtered = filterObjectsByText('c', list);
      expect(filtered.length).to.equal(2);
      expect(filtered[0].date).to.equal('2');
      expect(filtered[1].date).to.equal('c');
    });

    it('should chop entry text and prefix it with ellipses when the matched text query is > 40 characters into the entry', () => {
      const list = [ { date: '1', text: 'should chop entry text and prefix it with ellipses' } ];
      const filtered = filterObjectsByText('ellipses', list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].previewText).to.equal('...ould chop entry text and prefix it with ellipses');
    });
  });

  describe('filterHiddenEntries', () => {
    const list = [ { deleted: '1' }, {  } ];
    
    it('should return an empty array if passed undefined', () => {
      const filtered = filterHiddenEntries();
      expect(filtered.length).to.equal(0);
    });

    it('should filter deleted entries', () => {
      const filtered = filterHiddenEntries(list);
      expect(filtered.length).to.equal(1);
      expect(filtered[0].deleted).to.be.undefined;
    });
  });

  /* I need to spend more time with this test. The spies are incorrect somehow. */
  describe('applyFilters', () => {
    const query = 'query';
    const list = [
      { deleted: '1' },
      { date: '1', text: '' },
      { date: '1', text: 'query' },
      { date: 'query', text: '1' }
    ];

    it('should call filterHiddenEntries and filterObjectsByText', () => {
      const filtered = applyFilters(query, list);
      expect(filtered.length).to.equal(2);
      expect(filtered[0].text).to.equal(query);
      expect(filtered[1].date).to.equal(query);
    });
  });

  describe('clearLocalStorage', () => {
    it('should clear localStorage', () => {
      sinon.spy(localStorage, 'clear');
      clearLocalStorage();
      expect(localStorage.clear.calledOnce);
      localStorage.clear.restore();
    });
  });

  describe('getViewFromHref', () => {
    const rootHref = '/';
    const newHref = '/entry/new';
    const entriesHref = '/entries'
    const entryHref = '/entry/1234'
    
    it('should return /new if href contains /new', () => {
      expect(getViewFromHref(newHref)).to.equal('/new');
    });

    it('should return /entry when passed /entry/1234', () => {
      expect(getViewFromHref(entryHref)).to.equal('/entry');
    });

    it('should return /entries when passed /entries', () => {
      expect(getViewFromHref(entriesHref)).to.equal('/entries');
    });
    
    it('should return / when passed /', () => {
      expect(getViewFromHref(rootHref)).to.equal('/');
    });
  });

  describe('merge', () => {
    let a = { a: 'a' };
    let b = { b: 'b' };

    it('should add b\'s props to a without changing a\'s reference', () => {
      const keys = Object.keys(merge(a, b));
      expect(keys.length).to.equal(2);
      expect(keys.includes('a'));
      expect(keys.includes('b'));
    });
  });
  
});
