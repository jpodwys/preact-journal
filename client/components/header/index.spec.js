import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { mount, fireEvent, settle } from '../../../test/mount';
import { mockUpdateEntry, lastBody } from '../../../test/api-mocks';
import { app } from '../../js/app-state';
import Header from './index';

describe('header', () => {
  let env;
  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    fetchMock.restore();
  });

  function mountHeader (state) {
    return mount(h(Header, null), { state });
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

    it('appears once the store says the user is logged in', async () => {
      env = mountHeader({ loggedIn: false, view: '/entries' });
      app.loggedIn = true;
      await settle();
      expect(env.getByRole('banner')).to.exist;
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

    it('updates the count when entries are written to the store', async () => {
      env = mountHeader({ loggedIn: true, view: '/entries' });
      expect(env.getByText('0 Entries')).to.exist;
      // viewEntries is computed by the app-state watcher from entries.
      app.entries = [{ id: 1, date: '2024-01-02', text: 'a' }, { id: 2, date: '2024-01-01', text: 'b' }];
      await settle();
      expect(env.getByText('2 Entries')).to.exist;
    });

    it('clicking the menu icon opens the menu dialog', () => {
      env = mountHeader({ loggedIn: true, view: '/entries' });
      fireEvent.click(env.getByRole('button', { name: 'Menu' }));
      expect(app.dialogMode).to.equal('menu');
    });
  });

  describe('on /search', () => {
    it('renders the search form with input, count and clear control', () => {
      env = mountHeader({
        loggedIn: true,
        view: '/search',
        entries: [{ id: 1, date: '2024-01-01', text: 'foo one' }, { id: 2, date: '2024-01-02', text: 'foo two' }],
        filter: '',
        filterText: 'foo'
      });
      expect(env.getByRole('form', { name: 'Search' })).to.exist;
      const input = env.getByRole('textbox');
      expect(input.value).to.equal('foo');
      expect(env.getByText('2')).to.exist;
      expect(env.getByRole('button', { name: 'Clear filters' })).to.exist;
      expect(env.host.querySelector('.add-entry')).to.not.exist;
    });

    it('uses star-empty when no filter is set', () => {
      env = mountHeader(SEARCH_VIEW_DEFAULTS);
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-empty');
    });

    it('uses star-filled when the favorites filter is on', () => {
      env = mountHeader(Object.assign({}, SEARCH_VIEW_DEFAULTS, { filter: 'favorites' }));
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-filled');
    });
  });

  describe('on /entry with an existing entry', () => {
    const entry = { id: 1, text: 'hello', date: '2024-01-01', favorited: true };

    it('shows back, delete and a filled favorite icon, and no FAB', () => {
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

    it('clicking delete opens the delete-confirm modal for this entry', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry, entries: [entry] });
      fireEvent.click(env.getByRole('button', { name: 'Delete entry' }));
      expect(app.dialogMode).to.equal('modal:delete');
      expect(app.entry.id).to.equal(1);
    });

    it('clicking the favorite icon unfavorites the entry and PATCHes the server', async () => {
      mockUpdateEntry(1);
      env = mountHeader({ loggedIn: true, view: '/entry', entry, entries: [entry] });
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorite' }));

      expect(app.entry.favorited).to.equal(false);
      expect(app.entries[0].favorited).to.equal(false);
      expect(fetchMock.called('/api/entry/1')).to.be.true;
      expect(lastBody('/api/entry/1')).to.deep.equal({ favorited: false });

      await settle();
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
      expect(env.getByRole('link', { name: 'Back' })).to.exist;
      expect(env.queryByRole('button', { name: 'Delete entry' })).to.not.exist;
      expect(env.queryByRole('button', { name: 'Toggle favorite' })).to.not.exist;
    });
  });

  describe('back link on /entry and /search', () => {
    const baseEntry = { id: 1, text: 'hello', date: '2024-01-01' };

    it('back link href is /entries on /entry with no filter or search text', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
      expect(env.getByRole('link', { name: 'Back' }).getAttribute('href')).to.equal('/entries');
    });

    it('back link href is /search when filter is active on /entry', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry, filter: 'favorites' });
      expect(env.getByRole('link', { name: 'Back' }).getAttribute('href')).to.equal('/search');
    });

    it('back link href is /search when filterText is set on /entry', () => {
      env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry, filterText: 'beach' });
      expect(env.getByRole('link', { name: 'Back' }).getAttribute('href')).to.equal('/search');
    });

    it('back link href is always /entries on /search regardless of filter', () => {
      env = mountHeader({ loggedIn: true, view: '/search', filter: 'favorites', filterText: 'x' });
      expect(env.getByRole('link', { name: 'Back' }).getAttribute('href')).to.equal('/entries');
    });

    it('plain click calls history.back() and preventsDefault on the navigation', () => {
      const backStub = sinon.stub(history, 'back');
      try {
        env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
        const event = fireEvent.click(env.getByRole('link', { name: 'Back' }));
        expect(backStub.calledOnce).to.be.true;
        expect(event.defaultPrevented).to.be.true;
      } finally {
        backStub.restore();
      }
    });

    it('cmd/ctrl-click does not preventDefault, letting the browser open a new tab', () => {
      const backStub = sinon.stub(history, 'back');
      try {
        env = mountHeader({ loggedIn: true, view: '/entry', entry: baseEntry });
        const link = env.getByRole('link', { name: 'Back' });
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
        // Stop the real navigation at the host so the test page stays put,
        // after the link's own handler has had its chance to preventDefault.
        const wasPrevented = [];
        env.host.addEventListener('click', e => { wasPrevented.push(e.defaultPrevented); e.preventDefault(); });
        link.dispatchEvent(event);
        expect(backStub.called).to.be.false;
        expect(wasPrevented).to.deep.equal([false]);
      } finally {
        backStub.restore();
      }
    });
  });

  describe('share icon on /entry', () => {
    const entry = { id: 7, text: 'shareable', date: '2024-05-01' };

    it('renders and calls navigator.share with the entry text when share is supported', () => {
      const original = Object.getOwnPropertyDescriptor(navigator, 'share');
      const shareSpy = sinon.spy();
      // navigator.share is read-only in some browsers; define instead of assign.
      Object.defineProperty(navigator, 'share', { configurable: true, value: shareSpy });
      try {
        env = mountHeader({ loggedIn: true, view: '/entry', entry });
        const shareIcon = env.getByRole('button', { name: 'Share entry' });
        fireEvent.click(shareIcon);
        expect(shareSpy.calledOnce).to.be.true;
        expect(shareSpy.args[0][0]).to.deep.equal({ text: '2024-05-01 shareable' });
      } finally {
        if(original) Object.defineProperty(navigator, 'share', original);
        else delete navigator.share;
      }
    });

    it('is not rendered when navigator.share is unsupported', () => {
      const original = Object.getOwnPropertyDescriptor(navigator, 'share');
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      try {
        env = mountHeader({ loggedIn: true, view: '/entry', entry });
        expect(env.queryByRole('button', { name: 'Share entry' })).to.not.exist;
      } finally {
        if(original) Object.defineProperty(navigator, 'share', original);
        else delete navigator.share;
      }
    });
  });

  describe('search interactions on /search', () => {
    let clock;
    // Fake only timers: rendering runs on requestAnimationFrame, which must stay real.
    beforeEach(() => { clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
    afterEach(() => clock.restore());

    const searchState = (overrides) => Object.assign({}, SEARCH_VIEW_DEFAULTS, overrides);

    it('typing in the filter input writes filterText after the debounce window', () => {
      env = mountHeader(searchState());

      fireEvent.input(env.host.querySelector('#fi'), 'beach');
      expect(app.filterText).to.equal('');
      clock.tick(99);
      expect(app.filterText).to.equal('');
      clock.tick(1);

      expect(app.filterText).to.equal('beach');
    });

    it('coalesces a burst of keystrokes into a single write of the last value', () => {
      env = mountHeader(searchState());
      const writes = [];
      let current = app.filterText;
      const input = env.host.querySelector('#fi');
      const record = () => { if(app.filterText !== current) writes.push(current = app.filterText); };

      fireEvent.input(input, 'b');
      clock.tick(50); record();
      fireEvent.input(input, 'be');
      clock.tick(50); record();
      fireEvent.input(input, 'bea');
      clock.tick(99); record();
      clock.tick(1); record();

      expect(writes).to.deep.equal(['bea']);
    });

    it('filtering by text narrows the visible count', async () => {
      env = mountHeader(searchState({
        entries: [
          { id: 1, date: '2024-01-02', text: 'day at the beach' },
          { id: 2, date: '2024-01-01', text: 'rainy' }
        ]
      }));
      expect(env.host.querySelector('.search-entry-count').textContent).to.equal('0');
      fireEvent.input(env.host.querySelector('#fi'), 'beach');
      clock.tick(100);
      await settle();
      expect(env.host.querySelector('.search-entry-count').textContent).to.equal('1');
      // The input keeps what the user typed (its vnode value now matches it).
      expect(env.host.querySelector('#fi').value).to.equal('beach');
    });

    it('clicking the clear icon clears filter and filterText', () => {
      env = mountHeader(searchState({ filter: 'favorites', filterText: 'beach' }));
      fireEvent.click(env.getByRole('button', { name: 'Clear filters' }));
      expect(app.filter).to.equal('');
      expect(app.filterText).to.equal('');
      expect(env.host.querySelector('#fi').value).to.equal('');
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-empty');
    });

    it('clicking the empty-star icon turns the favorites filter on', () => {
      env = mountHeader(searchState({ filter: '' }));
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorites filter' }));
      expect(app.filter).to.equal('favorites');
      expect(env.getByRole('button', { name: 'Toggle favorites filter' }).getAttribute('icon')).to.equal('star-filled');
    });

    it('clicking the filled-star icon turns the favorites filter off', () => {
      env = mountHeader(searchState({ filter: 'favorites' }));
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorites filter' }));
      expect(app.filter).to.equal('');
    });

    it('submitting the search form blurs the input (closes the soft keyboard)', () => {
      env = mountHeader(searchState());
      const input = env.host.querySelector('#fi');
      const blurSpy = sinon.spy(input, 'blur');
      const event = fireEvent.submit(env.getByRole('form', { name: 'Search' }));
      expect(blurSpy.calledOnce).to.be.true;
      expect(event.defaultPrevented).to.be.true;
    });

    it('a pending search still runs when the header unmounts (a debounced call is never lost)', () => {
      env = mountHeader(searchState());
      fireEvent.input(env.host.querySelector('#fi'), 'beach');
      expect(app.filterText).to.equal('');       // still debouncing
      env.cleanup();
      env = null;
      expect(app.filterText).to.equal('beach');
      clock.tick(200);
      expect(app.filterText).to.equal('beach');
    });
  });
});
