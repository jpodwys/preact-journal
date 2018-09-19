import { clearLocalStorage } from '../utils';
import getInitialState from './index';
  
describe('appState', () => {
  let state;

  beforeEach(() => {
    state = getInitialState();
  });

  afterEach(() => {
    clearLocalStorage();
  });

  it('should return correct defaults', () => {
    // scrollPosition: 0,
    // view: getViewFromHref(location.href),
    // showFilterInput: false,
    // filterText: '',
    // loggedIn: loggedIn,
    // timestamp: timestamp,
    // entry: undefined,
    // entryIndex: -1,
    // entries: entries,
    // viewEntries: viewEntries || entries,
    // toastConfig: undefined,
    // dark: localStorage.getItem('dark') === 'true'

    expect(typeof state).to.equal('object');
    expect(state.scrollPosition).to.equal(0);
    // expect(state.view).to.equal(0);
    expect(state.showFilterInput).to.be.false;
    expect(state.filterText).to.equal('');
    // expect(state.loggedIn).to.equal(0);
    // expect(state.timestamp).to.equal(0);
    expect(state.entry).to.be.undefined;
    expect(state.entryIndex).to.equal(-1);
    // expect(state.entries).to.equal(0);
    // expect(state.viewEntries).to.equal(0);
    expect(state.toastConfig).to.be.undefined;
    // expect(state.dark).to.equal(0);
  });

  it('should persist dark, timestamp, and entries (date-sorted) to localStorage when changed', () => {
    expect(localStorage.getItem('dark')).to.be.null;
    expect(localStorage.getItem('timestamp')).to.be.null;
    expect(localStorage.getItem('entries')).to.be.null;

    state.dark = true;
    state.timestamp = 1234;

    const OLDER = '2017-01-01';
    const NEWER = '2018-01-01';
    state.entries = [ { date: OLDER }, { date: NEWER } ];

    expect(localStorage.getItem('dark')).to.equal('true');
    expect(localStorage.getItem('timestamp')).to.equal('1234');

    const entries = JSON.parse(localStorage.getItem('entries'));
    expect(entries[0].date).to.equal(NEWER);
    expect(entries[1].date).to.equal(OLDER);
  });

  it('should compute and set viewEntries whenever entries or filterText change', () => {
    expect(state.viewEntries).to.be.undefined;

    state.entries = [ { date: '2018-01-01', text: 'hi' } ];
    expect(state.viewEntries[0].text).to.equal('hi');

    state.filterText = 'yo';
    expect(state.viewEntries.length).to.equal(0);
  });

});
