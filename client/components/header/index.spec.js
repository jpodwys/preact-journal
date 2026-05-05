import { h } from 'preact';
import { mount } from '../../../test/mount';
import Header from './index';

describe('header (DOM)', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountHeader (state) {
    return mount(h(Header, null), { state });
  }

  describe('hidden', () => {
    it('renders nothing when not logged in', () => {
      env = mountHeader({ loggedIn: false, view: '/entries' });
      expect(env.host.querySelector('header')).to.not.exist;
    });

    it('renders nothing on /switch even when logged in', () => {
      env = mountHeader({ loggedIn: true, view: '/switch' });
      expect(env.host.querySelector('header')).to.not.exist;
    });
  });

  describe('on /entries', () => {
    it('shows the entry count, the search link, and the FAB add button', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/entries',
        viewEntries: [{}, {}, {}]
      });
      expect(env.getByText('3 Entries')).to.exist;
      expect(env.host.querySelector('a[href="/search"]')).to.exist;
      expect(env.host.querySelector('a[href="/entry/new"]')).to.exist;
      expect(env.host.querySelector('.add-entry')).to.exist;
      expect(env.host.querySelector('.search-form')).to.not.exist;
    });

    it('does not show a back link', () => {
      env = mountHeader({ loggedIn: true, view: '/entries', viewEntries: [] });
      expect(env.host.querySelector('svg[icon="back"]')).to.not.exist;
    });
  });

  describe('on /search', () => {
    it('renders the search form with input, count and clear control', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/search',
        viewEntries: [{}, {}],
        filter: '',
        filterText: 'foo'
      });
      expect(env.host.querySelector('.search-form')).to.exist;
      const input = env.getByRole('textbox');
      expect(input.value).to.equal('foo');
      expect(env.getByText('2')).to.exist;
      expect(env.host.querySelector('.add-entry')).to.not.exist;
    });

    it('uses star-empty when no filter is set', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/search',
        viewEntries: [],
        filter: '',
        filterText: ''
      });
      expect(env.host.querySelector('.search-form svg[icon="star-empty"]')).to.exist;
    });

    it('uses star-filled when the favorites filter is on', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/search',
        viewEntries: [],
        filter: 'favorites',
        filterText: ''
      });
      expect(env.host.querySelector('.search-form svg[icon="star-filled"]')).to.exist;
    });
  });

  describe('on /entry with an existing entry', () => {
    const entry = { id: 'e1', text: 'hello', date: '2024-01-01', favorited: true };

    it('shows back, delete and a filled favorite icon — and no FAB', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry });
      expect(env.host.querySelector('svg[icon="back"]')).to.exist;
      expect(env.host.querySelector('svg[icon="delete"]')).to.exist;
      expect(env.host.querySelector('svg[icon="star-filled"]')).to.exist;
      expect(env.host.querySelector('.add-entry')).to.not.exist;
    });

    it('shows star-empty when the entry is not favorited', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/entry',
        entry: Object.assign({}, entry, { favorited: false })
      });
      expect(env.host.querySelector('svg[icon="star-empty"]')).to.exist;
      expect(env.host.querySelector('svg[icon="star-filled"]')).to.not.exist;
    });
  });

  describe('on /new with a brand-new entry', () => {
    it('does not show delete or favorite icons', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/new',
        entry: { newEntry: true }
      });
      expect(env.host.querySelector('svg[icon="delete"]')).to.not.exist;
      expect(env.host.querySelector('svg[icon="star-empty"]')).to.not.exist;
      expect(env.host.querySelector('svg[icon="star-filled"]')).to.not.exist;
    });
  });
});
