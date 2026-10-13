import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import Header from './index';

describe('header', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountHeader (state, actions) {
    return mount(h(Header, null), { state, actions: actions || {} });
  }

  const SEARCH_VIEW_DEFAULTS = {
    loggedIn: true,
    view: '/search',
    viewEntries: [],
    filter: '',
    filterText: ''
  };

  describe('hidden', () => {
    it('renders nothing when not logged in', () => {
      env = mountHeader({ loggedIn: false, view: '/entries' });
      expect(env.queryByRole('banner')).to.not.exist;
    });

    it('renders nothing on /switch even when logged in', () => {
      env = mountHeader({ loggedIn: true, view: '/switch' });
      expect(env.queryByRole('banner')).to.not.exist;
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
      expect(env.getByRole('link', { name: 'Search' })).to.exist;
      expect(env.getByRole('link', { name: 'New entry' })).to.exist;
      expect(env.host.querySelector('.add-entry')).to.exist;
      expect(env.queryByRole('form', { name: 'Search' })).to.not.exist;
    });

    it('does not show a back link', () => {
      env = mountHeader({ loggedIn: true, view: '/entries', viewEntries: [] });
      expect(env.queryByRole('link', { name: 'Back' })).to.not.exist;
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
      expect(env.getByRole('form', { name: 'Search' })).to.exist;
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
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-empty');
    });

    it('uses star-filled when the favorites filter is on', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/search',
        viewEntries: [],
        filter: 'favorites',
        filterText: ''
      });
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-filled');
    });
  });

  describe('on /entry with an existing entry', () => {
    const entry = { id: 'e1', text: 'hello', date: '2024-01-01', favorited: true };

    it('shows back, delete and a filled favorite icon — and no FAB', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry });
      expect(env.getByRole('link', { name: 'Back' })).to.exist;
      expect(env.getByRole('button', { name: 'Delete entry' })).to.exist;
      expect(env.getByRole('button', { name: 'Toggle favorite' }).getAttribute('icon')).to.equal('star-filled');
      expect(env.host.querySelector('.add-entry')).to.not.exist;
    });

    it('shows star-empty when the entry is not favorited', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/entry',
        entry: Object.assign({}, entry, { favorited: false })
      });
      expect(env.getByRole('button', { name: 'Toggle favorite' }).getAttribute('icon')).to.equal('star-empty');
    });
  });

  describe('on /new with a brand-new entry', () => {
    it('does not show delete or favorite icons', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/new',
        entry: { newEntry: true }
      });
      expect(env.queryByRole('button', { name: 'Delete entry' })).to.not.exist;
      expect(env.queryByRole('button', { name: 'Toggle favorite' })).to.not.exist;
    });
  });

  describe('back link on /entry and /search', () => {
    const baseEntry = { id: 'e1', text: 'hello', date: '2024-01-01' };

    it('back link href is /entries on /entry with no filter or search text', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
      const back = env.getByRole('link', { name: 'Back' });
      expect(back.getAttribute('href')).to.equal('/entries');
    });

    it('back link href is /search when filter is active on /entry', () => {
      env = mountHeader({
        loggedIn: true, view: '/entry', entry: baseEntry, filter: 'favorites'
      });
      const back = env.getByRole('link', { name: 'Back' });
      expect(back.getAttribute('href')).to.equal('/search');
    });

    it('back link href is /search when filterText is set on /entry', () => {
      env = mountHeader({
        loggedIn: true, view: '/entry', entry: baseEntry, filterText: 'beach'
      });
      const back = env.getByRole('link', { name: 'Back' });
      expect(back.getAttribute('href')).to.equal('/search');
    });

    it('back link href is always /entries on /search regardless of filter', () => {
      env = mountHeader({
        loggedIn: true, view: '/search', filter: 'favorites', filterText: 'x'
      });
      const back = env.getByRole('link', { name: 'Back' });
      expect(back.getAttribute('href')).to.equal('/entries');
    });

    it('plain click calls history.back() and preventsDefault on the navigation', () => {
      const backSpy = sinon.spy(history, 'back');
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
      const link = env.getByRole('link', { name: 'Back' });
      const event = fireEvent.click(link);
      expect(backSpy.calledOnce).to.be.true;
      expect(event.defaultPrevented).to.be.true;
      backSpy.restore();
    });

    it('cmd/ctrl-click does not preventDefault — lets the browser open in a new tab', () => {
      const backSpy = sinon.spy(history, 'back');
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
      const link = env.getByRole('link', { name: 'Back' });
      const event = new MouseEvent('click', {
        bubbles: true, cancelable: true, button: 0, metaKey: true
      });
      link.dispatchEvent(event);
      expect(backSpy.called).to.be.false;
      expect(event.defaultPrevented).to.be.false;
      backSpy.restore();
    });
  });

  describe('share icon on /entry', () => {
    const entry = { id: 7, text: 'shareable', date: '2024-05-01' };

    it('renders and calls navigator.share with the entry text when share is supported', () => {
      const original = navigator.share;
      const shareSpy = sinon.spy();
      // navigator.share is read-only in some browsers; define instead of assign.
      Object.defineProperty(navigator, 'share', {
        configurable: true, value: shareSpy
      });

      env = mountHeader({ loggedIn: true, view: '/entry', entry });
      const shareIcon = env.getByRole('button', { name: 'Share entry' });
      expect(shareIcon, 'share icon rendered when navigator.share exists').to.exist;
      fireEvent.click(shareIcon);

      expect(shareSpy.calledOnce).to.be.true;
      expect(shareSpy.args[0][0]).to.deep.equal({
        text: '2024-05-01 shareable'
      });

      if(original === undefined) delete navigator.share;
      else Object.defineProperty(navigator, 'share', { configurable: true, value: original });
    });
  });

  describe('search interactions on /search', () => {
    let clock;
    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => clock.restore());

    const searchState = (overrides) => Object.assign({}, SEARCH_VIEW_DEFAULTS, overrides);

    it('typing in the filter input fires filterByText after the debounce window', () => {
      const filterByText = sinon.spy();
      env = mountHeader(searchState(), { filterByText });

      fireEvent.input(env.host.querySelector('#fi'), 'beach');
      expect(filterByText.called).to.be.false;
      clock.tick(99);
      expect(filterByText.called).to.be.false;
      clock.tick(1);

      expect(filterByText.calledOnce).to.be.true;
      expect(filterByText.args[0][1]).to.equal('beach');
    });

    it('coalesces a burst of keystrokes into a single fire', () => {
      const filterByText = sinon.spy();
      env = mountHeader(searchState(), { filterByText });

      const input = env.host.querySelector('#fi');
      fireEvent.input(input, 'b');
      clock.tick(50);
      fireEvent.input(input, 'be');
      clock.tick(50);
      fireEvent.input(input, 'bea');
      clock.tick(100);

      expect(filterByText.calledOnce).to.be.true;
      expect(filterByText.args[0][1]).to.equal('bea');
    });

    it('clicking the clear icon fires clearFilters', () => {
      const clearFilters = sinon.spy();
      env = mountHeader(searchState(), { clearFilters });
      fireEvent.click(env.getByRole('button', { name: 'Clear filters' }));
      expect(clearFilters.calledOnce).to.be.true;
    });

    it('clicking the empty-star icon turns the favorites filter on', () => {
      const linkstate = sinon.spy();
      env = mountHeader(searchState({ filter: '' }), { linkstate });
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorites filter' }));
      expect(linkstate.calledOnce).to.be.true;
      expect(linkstate.args[0][1]).to.deep.equal({ key: 'filter', val: 'favorites' });
    });

    it('clicking the filled-star icon turns the favorites filter off', () => {
      const linkstate = sinon.spy();
      env = mountHeader(searchState({ filter: 'favorites' }), { linkstate });
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorites filter' }));
      expect(linkstate.calledOnce).to.be.true;
      expect(linkstate.args[0][1]).to.deep.equal({ key: 'filter', val: '' });
    });

    it('submitting the search form blurs the input (closes the soft keyboard)', () => {
      env = mountHeader(searchState());
      const input = env.host.querySelector('#fi');
      const blurSpy = sinon.spy(input, 'blur');
      fireEvent.submit(env.getByRole('form', { name: 'Search' }));
      expect(blurSpy.calledOnce).to.be.true;
    });
  });
});
