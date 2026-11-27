import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { clear as idbClear } from 'idb-keyval';
import { mount, fireEvent, waitFor, waitForElementToBeRemoved } from '../../../test/mount';
import { mockGetAllEntries, mockDeleteEntry, mockLogout } from '../../../test/api-mocks';
import { app, selected } from '../../js/app-state';
import { resetDataFetched } from '../../js/actions/entry-actions';
import DialogWrapper from './index';

describe('dialog-wrapper', () => {
  let env;

  function setAccounts (accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }
  const getAccounts = () => JSON.parse(localStorage.getItem('accounts')) || [];

  beforeEach(() => {
    localStorage.clear();
    fetchMock.restore();
    resetDataFetched();
  });
  afterEach(async () => {
    if(env) env.cleanup();
    env = null;
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    history.replaceState(null, '', '/');
  });

  function mountDialog ({ state = {} } = {}) {
    return mount(h(DialogWrapper, null), {
      // `view` goes first: writing a new view resets dialogMode (app-state watcher).
      state: Object.assign({
        view: '/entries',
        dialogMode: 'menu',
        dark: false,
        sort: 'desc',
        userId: '1'
      }, state)
    });
  }

  it('renders nothing when dialogMode is falsey', () => {
    env = mountDialog({ state: { dialogMode: '' } });
    expect(env.queryByRole('list')).to.not.exist;
    expect(env.host.querySelector('.modal-overlay')).to.not.exist;
    expect(env.queryByText('Logout')).to.be.null;
  });

  it('opens when dialogMode is written to the store', async () => {
    env = mountDialog({ state: { dialogMode: '' } });
    app.dialogMode = 'menu';
    await env.findByRole('list');
  });

  describe('menu username', () => {
    it('renders the username as the first menu item', () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      env = mountDialog();
      expect(env.getByRole('list').firstElementChild.textContent).to.equal('testuser');
    });

    it('renders the correct username when the active account changes', async () => {
      setAccounts([{ id: 1, username: 'alice', active: true }]);
      env = mountDialog();
      expect(env.getByRole('list').firstElementChild.textContent).to.equal('alice');
      app.accounts = [{ id: 1, username: 'bob', active: true }];
      await waitFor(() => expect(env.getByRole('list').firstElementChild.textContent).to.equal('bob'));
    });
  });

  describe('with a single logged-in account', () => {
    let pushSpy;

    beforeEach(() => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      // history.pushState is the boundary the router crosses on navigation.
      pushSpy = sinon.spy(history, 'pushState');
    });

    afterEach(() => pushSpy.restore());

    it('shows Add (with the person-add icon) and not Switch', () => {
      env = mountDialog();
      const addRow = env.getByText('Add').parentElement;
      expect(addRow.querySelector('svg[icon="person-add"]')).to.exist;
      expect(env.queryByText('Switch')).to.be.null;
    });

    it('closes the menu and routes to /switch when Add is clicked', async () => {
      env = mountDialog();
      fireEvent.click(env.getByText('Add'));
      expect(app.dialogMode).to.not.be.ok;
      expect(pushSpy.calledOnce).to.be.true;
      expect(pushSpy.args[0][2]).to.equal('/switch');
      expect(location.pathname).to.equal('/switch');
      await waitForElementToBeRemoved(() => env.queryByText('Add'));
    });
  });

  describe('with two logged-in accounts', () => {
    beforeEach(() => {
      setAccounts([
        { id: 1, username: 'testuser', active: true },
        { id: 2, username: 'other', active: false }
      ]);
    });

    it('shows Switch (with the people icon) and not Add', () => {
      env = mountDialog();
      const switchRow = env.getByText('Switch').parentElement;
      expect(switchRow.querySelector('svg[icon="people"]')).to.exist;
      expect(env.queryByText('Add')).to.be.null;
    });

    it('closes the menu and switches to the other account when Switch is clicked', async () => {
      mockGetAllEntries({ entries: [] });
      env = mountDialog();
      fireEvent.click(env.getByText('Switch'));
      // The click itself closes the menu (loading the other account would also close it, but only later)...
      expect(app.dialogMode).to.equal('');
      // The account flip is persisted synchronously...
      expect(getAccounts().find(a => a.active).id).to.equal(2);
      await waitForElementToBeRemoved(() => env.queryByText('Switch'));
      // ...and the store follows once the account's cached entries load.
      await waitFor(() => expect(app.userId).to.equal('2'));
      expect(app.accounts.find(a => a.active).username).to.equal('other');
      expect(location.pathname).to.equal('/entries');
      expect(fetchMock.called('/api/entries')).to.be.true;
    });

    it('switches to the correct account regardless of stored order', async () => {
      mockGetAllEntries({ entries: [] });
      setAccounts([
        { id: 5, username: 'other', active: false },
        { id: 1, username: 'testuser', active: true }
      ]);
      env = mountDialog();
      fireEvent.click(env.getByText('Switch'));
      expect(getAccounts().find(a => a.active).id).to.equal(5);
      await waitFor(() => expect(app.userId).to.equal('5'));
    });
  });

  describe('overlay', () => {
    it('closes the menu when the overlay is clicked', async () => {
      env = mountDialog();
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      await waitForElementToBeRemoved(() => env.queryByRole('list'));
      expect(env.queryByText('Logout')).to.be.null;
    });

    it('closes the delete-confirm modal when the overlay is clicked', async () => {
      env = mountDialog({
        state: { dialogMode: 'modal:delete', entry: { id: 1, date: 'd', text: 't' } }
      });
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      await waitForElementToBeRemoved(() => env.queryByText('Delete this entry?'));
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });

    it('closes the logout-confirm modal when the overlay is clicked', async () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      await waitForElementToBeRemoved(() => env.queryByText('Logout?'));
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });
  });

  describe('menu: sort toggle', () => {
    it('shows "Oldest" when sort is desc; clicking flips sort to asc and closes the menu', async () => {
      env = mountDialog({ state: { sort: 'desc' } });
      expect(env.queryByText('Latest')).to.be.null;
      fireEvent.click(env.getByText('Oldest'));
      expect(app.sort).to.equal('asc');
      await waitForElementToBeRemoved(() => env.queryByRole('list'));
    });

    it('shows "Latest" when sort is asc; clicking flips sort to desc', () => {
      env = mountDialog({ state: { sort: 'asc' } });
      expect(env.queryByText('Oldest')).to.be.null;
      fireEvent.click(env.getByText('Latest'));
      expect(app.sort).to.equal('desc');
    });

    it('hides the sort item on /entry', () => {
      env = mountDialog({ state: { view: '/entry' } });
      expect(env.queryByText('Oldest')).to.be.null;
      expect(env.queryByText('Latest')).to.be.null;
    });

    it('hides the sort item on /new', () => {
      env = mountDialog({ state: { view: '/new' } });
      expect(env.queryByText('Oldest')).to.be.null;
      expect(env.queryByText('Latest')).to.be.null;
    });
  });

  describe('menu: dark mode toggle', () => {
    afterEach(() => document.body.classList.remove('dark'));

    it('shows "Dark" with the moon icon when dark is false; clicking turns dark mode on', async () => {
      env = mountDialog({ state: { dark: false } });
      const row = env.getByText('Dark').parentElement;
      expect(row.querySelector('svg[icon="moon"]')).to.exist;
      fireEvent.click(env.getByText('Dark'));
      expect(app.dark).to.be.true;
      expect(localStorage.getItem('dark')).to.equal('true');
      expect(document.body.classList.contains('dark')).to.be.true;
      await waitForElementToBeRemoved(() => env.queryByRole('list'));
    });

    it('shows "Light" with the sun icon when dark is true', () => {
      env = mountDialog({ state: { dark: true } });
      const row = env.getByText('Light').parentElement;
      expect(row.querySelector('svg[icon="sun"]')).to.exist;
      expect(env.queryByText('Dark')).to.be.null;
    });
  });

  describe('menu: export', () => {
    let clock, createObjectURL;
    // Faking setTimeout keeps the deferred anchor.click() (the download) from running.
    beforeEach(() => {
      clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      createObjectURL = sinon.stub(URL, 'createObjectURL').returns('blob:test');
    });
    afterEach(() => { clock.restore(); createObjectURL.restore(); });

    it('clicking Export builds a text file of the visible entries and closes the menu', async () => {
      env = mountDialog({ state: { viewEntries: [{ id: 1, date: '2024-01-01', text: 'hello' }] } });
      fireEvent.click(env.getByText('Export'));
      expect(createObjectURL.calledOnce).to.be.true;
      expect(app.dialogMode).to.not.be.ok;
      await waitForElementToBeRemoved(() => env.queryByRole('list'));
      const text = await createObjectURL.args[0][0].text();
      expect(text).to.equal('2024-01-01\r\n\r\nhello\r\n\r\n\r\n');
    });

    it('hides Export on /entry', () => {
      env = mountDialog({ state: { view: '/entry' } });
      expect(env.queryByText('Export')).to.be.null;
    });

    it('hides Export on /new', () => {
      env = mountDialog({ state: { view: '/new' } });
      expect(env.queryByText('Export')).to.be.null;
    });
  });

  describe('modal mode: delete', () => {
    const entry = { id: 5, date: '2024-01-01', text: 'gone' };

    it('renders the delete-entry confirmation when dialogMode is "modal:delete"', () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry } });
      expect(env.getByText('Delete this entry?')).to.exist;
      expect(env.getByText('Delete')).to.exist;
      expect(env.getByText('Cancel')).to.exist;
      expect(env.queryByRole('list')).to.not.exist;
    });

    it('renders nothing for modal:delete when there is no entry', () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry: undefined } });
      expect(env.queryByText('Delete this entry?')).to.be.null;
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });

    it('Cancel clears dialogMode and the modal disappears', async () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry } });
      fireEvent.click(env.getByText('Cancel'));
      expect(app.dialogMode).to.not.be.ok;
      await waitForElementToBeRemoved(() => env.queryByText('Delete this entry?'));
    });

    it('Delete removes the entry, routes to /entries and sends DELETE for that id', async () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      mockDeleteEntry(5);
      history.replaceState(null, '', '/entry/5');
      env = mountDialog({
        state: { view: '/entry', dialogMode: 'modal:delete', entry, entries: [entry] }
      });
      fireEvent.click(env.getByText('Delete'));

      expect(fetchMock.called('/api/entry/5')).to.be.true;
      expect(fetchMock.lastOptions('/api/entry/5').method).to.equal('DELETE');
      expect(selected()[0]).to.be.undefined;
      expect(app.entries[0]).to.include({ id: 5, deleted: true, needsSync: true });
      expect(location.pathname).to.equal('/entries');

      await waitForElementToBeRemoved(() => env.queryByText('Delete this entry?'));
      await waitFor(() => expect(app.entries).to.deep.equal([]));
    });
  });

  describe('modal mode: logout', () => {
    it('renders the logout confirmation when dialogMode is "modal:logout"', () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      expect(env.getByText('Logout?')).to.exist;
      expect(env.getByText('Logout')).to.exist;
      expect(env.getByText('Cancel')).to.exist;
    });

    it('Cancel hides the logout modal', async () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      fireEvent.click(env.getByText('Cancel'));
      await waitForElementToBeRemoved(() => env.queryByText('Logout?'));
    });

    it('confirming Logout posts to the server, then logs the user out and routes to /', async () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      mockLogout();
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      fireEvent.click(env.getByText('Logout'));
      expect(fetchMock.called('/api/user/logout')).to.be.true;

      await waitForElementToBeRemoved(() => env.queryByText('Logout?'));
      await waitFor(() => {
        expect(getAccounts()).to.deep.equal([]);
        expect(app.userId).to.equal('');
        expect(location.pathname).to.equal('/');
      });
    });
  });

  describe('opening the logout modal from the menu', () => {
    let clock;
    beforeEach(() => { clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
    afterEach(() => clock.restore());

    it('clicking Logout in the menu closes the menu, then opens the logout modal on the next tick', async () => {
      env = mountDialog();
      fireEvent.click(env.getByText('Logout'));

      // Before the next tick: dialogMode cleared, menu gone, modal not yet open.
      expect(app.dialogMode).to.equal('');
      await waitForElementToBeRemoved(() => env.queryByRole('list'));
      expect(env.queryByText('Logout?')).to.be.null;

      clock.tick(0);
      expect(app.dialogMode).to.equal('modal:logout');
      await env.findByText('Logout?');
    });
  });
});
