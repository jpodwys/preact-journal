import { h } from 'preact';
import { mount } from '../../../test/mount';
import Entries from './index';

describe('entries', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountEntries (state = {}) {
    return mount(h(Entries, null), {
      state: Object.assign({ viewEntries: [], scrollPosition: 0, filterText: '' }, state)
    });
  }

  it('renders the zero-state when there are no entries', () => {
    env = mountEntries();
    expect(env.getByText("It's empty in here!")).to.exist;
    expect(env.host.querySelector('.entry-list')).to.not.exist;
  });

  it('renders the entry list (no zero-state) when entries are present', () => {
    env = mountEntries({
      viewEntries: [
        { id: 1, date: '2024-01-01', text: 'first' },
        { id: 2, date: '2024-01-02', text: 'second' }
      ]
    });
    expect(env.queryByText("It's empty in here!")).to.be.null;
    expect(env.host.querySelector('.entry-list')).to.exist;
    // The first entry's date appears via the rendered EntryPreview.
    expect(env.getByText('2024-01-01')).to.exist;
  });

  it('installs and removes the body scroll listener across mount/unmount', () => {
    document.body.onscroll = null;
    env = mountEntries();
    expect(document.body.onscroll).to.be.a('function');
    env.cleanup();
    env = null;
    expect(document.body.onscroll).to.be.null;
  });
});
