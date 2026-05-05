import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import Search from './index';

describe('search (DOM)', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountSearch (state = {}, actions = {}) {
    return mount(h(Search, null), {
      state: Object.assign({ filter: '', filterText: '', viewEntries: [] }, state),
      actions
    });
  }

  describe('empty viewEntries', () => {
    it('shows the Favorites and "On this day" menu when no filter is set', () => {
      env = mountSearch();
      expect(env.getByText('Favorites')).to.exist;
      expect(env.getByText('On this day')).to.exist;
      expect(env.queryByText("It's empty in here!")).to.be.null;
    });

    it('shows the zero-state when a filter is active', () => {
      env = mountSearch({ filter: 'favorites' });
      expect(env.getByText("It's empty in here!")).to.exist;
      expect(env.queryByText('Favorites')).to.be.null;
    });

    it('shows the zero-state when filterText is set', () => {
      env = mountSearch({ filterText: 'whatever' });
      expect(env.getByText("It's empty in here!")).to.exist;
      expect(env.queryByText('Favorites')).to.be.null;
    });

    it('fires linkstate with filter=favorites when Favorites is clicked', () => {
      const linkstate = sinon.spy();
      env = mountSearch({}, { linkstate });
      fireEvent.click(env.getByText('Favorites'));
      expect(linkstate.calledOnce).to.be.true;
      expect(linkstate.args[0][1]).to.deep.equal({ key: 'filter', val: 'favorites' });
    });

    it('fires linkstate with filterText=today\'s month-day slice when "On this day" is clicked', () => {
      const linkstate = sinon.spy();
      env = mountSearch({}, { linkstate });
      fireEvent.click(env.getByText('On this day'));
      const payload = linkstate.args[0][1];
      expect(payload.key).to.equal('filterText');
      expect(payload.val).to.equal(new Date().toISOString().slice(4, 10));
    });
  });

  describe('non-empty viewEntries', () => {
    it('renders the entries list, not the menu or zero-state', () => {
      env = mountSearch({ viewEntries: [{ id: 1, date: 'today', text: 'first' }] });
      expect(env.queryByText('Favorites')).to.be.null;
      expect(env.queryByText("It's empty in here!")).to.be.null;
      expect(env.host.querySelector('.entry-list')).to.exist;
    });
  });
});
