import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import DialogWrapper from './index';

describe('dialog-wrapper', () => {
  let env;

  function setAccounts (accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }

  const linkstate = (el, { key, val, cb }) => el.set({ [key]: val }, cb);

  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountDialog ({ state = {}, actions = {} } = {}) {
    return mount(h(DialogWrapper, null), {
      state: Object.assign({
        dialogMode: 'menu',
        dark: false,
        view: '/entries',
        sort: 'desc',
        userId: '1',
        username: 'testuser'
      }, state),
      actions: Object.assign({ linkstate }, actions)
    });
  }

  it('renders nothing when dialogMode is falsey', () => {
    env = mountDialog({ state: { dialogMode: '' } });
    expect(env.host.querySelector('.menu')).to.not.exist;
    expect(env.host.querySelector('.modal-overlay')).to.not.exist;
    expect(env.queryByText('Logout')).to.be.null;
  });

  describe('menu username', () => {
    it('renders the username as the first menu item', () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      env = mountDialog();
      const menu = env.host.querySelector('.menu');
      expect(menu.firstElementChild.textContent).to.equal('testuser');
    });

    it('renders the correct username when state.username changes', () => {
      setAccounts([{ id: 1, username: 'alice', active: true }]);
      env = mountDialog({ state: { username: 'alice' } });
      const menu = env.host.querySelector('.menu');
      expect(menu.firstElementChild.textContent).to.equal('alice');
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

    it('closes the menu and routes to /switch when Add is clicked', () => {
      env = mountDialog();
      fireEvent.click(env.getByText('Add'));
      expect(env.queryByText('Add')).to.be.null;
      expect(pushSpy.calledOnce).to.be.true;
      expect(pushSpy.args[0][2]).to.equal('/switch');
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

    it('closes the menu and fires switchAccount with the other id when Switch is clicked', () => {
      const switchAccount = sinon.spy();
      env = mountDialog({ actions: { switchAccount } });
      fireEvent.click(env.getByText('Switch'));
      expect(env.queryByText('Switch')).to.be.null;
      expect(switchAccount.calledOnce).to.be.true;
      expect(switchAccount.args[0][1]).to.equal('2');
    });

    it('switches to the correct account regardless of stored order', () => {
      setAccounts([
        { id: 5, username: 'other', active: false },
        { id: 1, username: 'testuser', active: true }
      ]);
      const switchAccount = sinon.spy();
      env = mountDialog({ actions: { switchAccount } });
      fireEvent.click(env.getByText('Switch'));
      expect(switchAccount.args[0][1]).to.equal('5');
    });
  });

  describe('overlay', () => {
    it('closes the menu when the overlay is clicked', () => {
      env = mountDialog();
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      expect(env.host.querySelector('.menu')).to.not.exist;
      expect(env.queryByText('Logout')).to.be.null;
    });

    it('closes the delete-confirm modal when the overlay is clicked', () => {
      env = mountDialog({
        state: { dialogMode: 'modal:delete', entry: { id: 1, date: 'd', text: 't' } }
      });
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      expect(env.queryByText('Delete this entry?')).to.be.null;
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });

    it('closes the logout-confirm modal when the overlay is clicked', () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      expect(env.queryByText('Logout?')).to.be.null;
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });
  });

  describe('menu — sort toggle', () => {
    it('shows "Oldest" when sort is desc and fires toggleSort when clicked', () => {
      const toggleSort = sinon.spy();
      env = mountDialog({ state: { sort: 'desc' }, actions: { toggleSort } });
      expect(env.queryByText('Latest')).to.be.null;
      fireEvent.click(env.getByText('Oldest'));
      expect(toggleSort.calledOnce).to.be.true;
    });

    it('shows "Latest" when sort is asc and fires toggleSort when clicked', () => {
      const toggleSort = sinon.spy();
      env = mountDialog({ state: { sort: 'asc' }, actions: { toggleSort } });
      expect(env.queryByText('Oldest')).to.be.null;
      fireEvent.click(env.getByText('Latest'));
      expect(toggleSort.calledOnce).to.be.true;
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

  describe('menu — dark mode toggle', () => {
    it('shows "Dark" with the moon icon when dark is false and fires toggleDarkMode', () => {
      const toggleDarkMode = sinon.spy();
      env = mountDialog({ state: { dark: false }, actions: { toggleDarkMode } });
      const row = env.getByText('Dark').parentElement;
      expect(row.querySelector('svg[icon="moon"]')).to.exist;
      fireEvent.click(env.getByText('Dark'));
      expect(toggleDarkMode.calledOnce).to.be.true;
    });

    it('shows "Light" with the sun icon when dark is true', () => {
      env = mountDialog({ state: { dark: true } });
      const row = env.getByText('Light').parentElement;
      expect(row.querySelector('svg[icon="sun"]')).to.exist;
      expect(env.queryByText('Dark')).to.be.null;
    });
  });

  describe('menu — export', () => {
    it('clicking Export fires exportEntries', () => {
      const exportEntries = sinon.spy();
      env = mountDialog({ actions: { exportEntries } });
      fireEvent.click(env.getByText('Export'));
      expect(exportEntries.calledOnce).to.be.true;
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

  describe('modal mode — delete', () => {
    const entry = { id: 5, date: '2024-01-01', text: 'gone' };

    it('renders the delete-entry confirmation when dialogMode is "modal:delete"', () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry } });
      expect(env.getByText('Delete this entry?')).to.exist;
      expect(env.getByText('Delete')).to.exist;
      expect(env.getByText('Cancel')).to.exist;
      expect(env.host.querySelector('.menu')).to.not.exist;
    });

    it('renders nothing for modal:delete when there is no entry', () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry: undefined } });
      expect(env.queryByText('Delete this entry?')).to.be.null;
      expect(env.host.querySelector('.modal-dialog')).to.not.exist;
    });

    it('Cancel clears dialogMode and the modal disappears', () => {
      env = mountDialog({ state: { dialogMode: 'modal:delete', entry } });
      fireEvent.click(env.getByText('Cancel'));
      expect(env.queryByText('Delete this entry?')).to.be.null;
    });

    it('Delete fires deleteEntry with the entry id', () => {
      const deleteEntry = sinon.spy();
      env = mountDialog({
        state: { dialogMode: 'modal:delete', entry },
        actions: { deleteEntry }
      });
      fireEvent.click(env.getByText('Delete'));
      expect(deleteEntry.calledOnce).to.be.true;
      expect(deleteEntry.args[0][1]).to.deep.equal({ id: 5 });
    });
  });

  describe('modal mode — logout', () => {
    it('renders the logout confirmation when dialogMode is "modal:logout"', () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      expect(env.getByText('Logout?')).to.exist;
      expect(env.getByText('Logout')).to.exist;
      expect(env.getByText('Cancel')).to.exist;
    });

    it('Cancel hides the logout modal', () => {
      env = mountDialog({ state: { dialogMode: 'modal:logout' } });
      fireEvent.click(env.getByText('Cancel'));
      expect(env.queryByText('Logout?')).to.be.null;
    });

    it('confirming Logout fires the logout action', () => {
      const logout = sinon.spy();
      env = mountDialog({
        state: { dialogMode: 'modal:logout' },
        actions: { logout }
      });
      fireEvent.click(env.getByText('Logout'));
      expect(logout.calledOnce).to.be.true;
    });
  });

  describe('opening the logout modal from the menu', () => {
    let clock;
    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => clock.restore());

    it('clicking Logout in the menu closes the menu, then opens the logout modal on the next tick', () => {
      env = mountDialog();
      fireEvent.click(env.getByText('Logout'));

      // Synchronously: dialogMode cleared, menu gone, modal not yet open.
      expect(env.queryByText('testuser')).to.be.null;
      expect(env.queryByText('Logout?')).to.be.null;

      clock.tick(0);

      expect(env.getByText('Logout?')).to.exist;
    });
  });

});
