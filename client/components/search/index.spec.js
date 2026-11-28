import { h } from '../../packages/kyvo/core';
import { mount, fireEvent } from '../../../test/mount';
import { app } from '../../js/app-state';
import Search from './index';

describe('search', () => {
  let env;
  beforeEach(() => localStorage.clear());
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountSearch (state = {}) {
    return mount(h(Search, null), {
      state: Object.assign({ filter: '', filterText: '', viewEntries: [] }, state)
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

    it('sets filter=favorites in the store when Favorites is clicked (and re-renders to the zero-state)', async () => {
      env = mountSearch();
      fireEvent.click(env.getByText('Favorites'));
      expect(app.filter).to.equal('favorites');
      // No entries are favorited, so the filtered view is empty.
      await env.findByText("It's empty in here!");
    });

    it('sets filterText to today\'s month-day slice when "On this day" is clicked', () => {
      env = mountSearch();
      fireEvent.click(env.getByText('On this day'));
      expect(app.filterText).to.equal(new Date().toLocaleDateString('en-CA').slice(5));
    });
  });

  describe('non-empty viewEntries', () => {
    it('renders the entries list, not the menu or zero-state', () => {
      env = mountSearch({ viewEntries: [{ id: 1, date: 'today', text: 'first' }] });
      expect(env.queryByText('Favorites')).to.be.null;
      expect(env.queryByText("It's empty in here!")).to.be.null;
      expect(env.getByText('first')).to.exist;
      expect(env.host.querySelector('.entry-preview')).to.exist;
    });
  });
});
