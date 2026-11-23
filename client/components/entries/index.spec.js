import { h } from '../../packages/kyvo/core';
import { mount, settle } from '../../../test/mount';
import { app } from '../../js/app-state';
import Entries from './index';

describe('entries', () => {
  let env;
  beforeEach(() => localStorage.clear());
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountEntries (state = {}) {
    return mount(h(Entries, null), {
      state: Object.assign({ viewEntries: [], filterText: '' }, state)
    });
  }

  it('renders the zero-state when there are no entries', () => {
    env = mountEntries();
    expect(env.getByText("It's empty in here!")).to.exist;
    expect(env.host.querySelector('.entry-preview')).to.not.exist;
  });

  it('renders the entry list (no zero-state) when entries are present', () => {
    env = mountEntries({
      viewEntries: [
        { id: 1, date: '2024-01-01', text: 'first' },
        { id: 2, date: '2024-01-02', text: 'second' }
      ]
    });
    expect(env.queryByText("It's empty in here!")).to.be.null;
    expect(env.host.querySelectorAll('.entry-preview').length).to.equal(2);
    expect(env.getByText('2024-01-01')).to.exist;
    expect(env.getByText('second')).to.exist;
    // Rows are 83px tall in the virtual list.
    expect(env.host.firstElementChild.style.height).to.equal(2 * 83 + 'px');
  });

  it('passes filterText through so previews highlight the match', () => {
    env = mountEntries({
      filterText: 'mid',
      entries: [{ id: 1, date: '2024-01-01', text: 'a mid b' }]
    });
    expect(env.host.querySelector('.highlight').textContent).to.equal('mid');
  });

  it('re-renders from the store: entries appearing replace the zero-state', async () => {
    env = mountEntries();
    app.entries = [{ id: 3, date: '2024-03-03', text: 'arrived' }];
    await settle();
    expect(env.queryByText("It's empty in here!")).to.be.null;
    expect(env.getByText('arrived')).to.exist;
  });
});
