import { get, set } from 'idb-keyval';
import getInitialState from './index';

describe('appState', () => {
  let state;

  const deleteCookie = (name) => {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };

  beforeEach(() => {
    localStorage.clear();
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
    expect(state.showFilterInput).to.be.false;
    expect(state.filterText).to.equal('');
    expect(state.loggedIn).to.be.false;
    expect(state.timestamp).to.be.undefined;
    expect(state.entry).to.be.undefined;
    expect(state.toast).to.be.undefined;
    expect(state.dialogMode).to.be.undefined;
    expect(state.entryIndex).to.equal(-1);
    expect(state.entries.length).to.equal(0);
    expect(state.viewEntries.length).to.equal(0);
    expect(state.toast).to.be.undefined;
    expect(state.dark).to.be.false;

    // const cb = sinon.spy();
    // document.addEventListener('boot', cb);
    document.cookie = 'logged_in=true;';
    set('entries', [ { id: 0, date: '2018-01-01', text: 'yo' } ]);
    localStorage.setItem('timestamp', '1234');
    localStorage.setItem('dark', 'true');
    state = getInitialState();

    expect(state.loggedIn).to.be.true;
    expect(state.timestamp).to.equal('1234');
    expect(state.dark).to.be.true;
    // This portion of the test is unreliable. Needs attention.
    // Should ensure that the boot event is fired with the expected entries
    // expect(state.entries[0].id).to.equal(0);
    // setTimeout(() => {
    //   expect(cb.called).to.be.true;
    //   document.removeEventListener('boot', cb);
    //   done();
    // });

    deleteCookie('logged_in');
  });

  it('should persist dark, timestamp, and entries (date-sorted) to localStorage when changed', (done) => {
    // I have to manually clear localStorage here to avoid a race condition...
    localStorage.clear();
    expect(localStorage.getItem('dark')).to.be.null;
    expect(localStorage.getItem('timestamp')).to.be.null;
    get('entries').then(entries => {
      expect(entries).to.be.undefined;

      state.dark = true;
      state.timestamp = 1234;

      const OLDER = '2017-01-01';
      const NEWER = '2018-01-01';
      state.entries = [ { date: OLDER }, { date: NEWER } ];

      expect(localStorage.getItem('dark')).to.equal('true');
      expect(localStorage.getItem('timestamp')).to.equal('1234');

      get('entries').then(entries => {
        expect(entries[0].date).to.equal(NEWER);
        expect(entries[1].date).to.equal(OLDER);
        done();
      });
    });
  });

  it('should compute and set viewEntries whenever entries or filterText change', () => {
    expect(state.viewEntries.length).to.equal(0);

    state.entries = [ { date: '2018-01-01', text: 'hi' } ];
    expect(state.viewEntries[0].text).to.equal('hi');

    state.filterText = 'yo';
    expect(state.viewEntries.length).to.equal(0);
  });

  it('should get entries from indexedDB and fire the boot event', (done) => {
    // NEED TO ADD ANOTHER TEST HERE
    done();
  });

});
