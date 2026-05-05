import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import DialogWrapper from './index';

describe('dialog-wrapper', () => {
  let env;
  let pushSpy;

  function setAccounts (accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }

  const linkstate = (el, { key, val, cb }) => el.set({ [key]: val }, cb);

  beforeEach(() => {
    localStorage.clear();
    // history.pushState is the boundary the router crosses on navigation.
    pushSpy = sinon.spy(history, 'pushState');
  });

  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    pushSpy.restore();
  });

  function mountMenu ({ state = {}, actions = {} } = {}) {
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
    env = mountMenu({ state: { dialogMode: '' } });
    expect(env.host.querySelector('.menu')).to.not.exist;
    expect(env.host.querySelector('.modal-overlay')).to.not.exist;
    expect(env.queryByText('Logout')).to.be.null;
  });

  describe('menu username', () => {
    it('renders the username as the first menu item', () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      env = mountMenu();
      const menu = env.host.querySelector('.menu');
      expect(menu.firstElementChild.textContent).to.equal('testuser');
    });

    it('renders the correct username when state.username changes', () => {
      setAccounts([{ id: 1, username: 'alice', active: true }]);
      env = mountMenu({ state: { username: 'alice' } });
      const menu = env.host.querySelector('.menu');
      expect(menu.firstElementChild.textContent).to.equal('alice');
    });
  });

  describe('with a single logged-in account', () => {
    beforeEach(() => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
    });

    it('shows Add (with the person-add icon) and not Switch', () => {
      env = mountMenu();
      const addRow = env.getByText('Add').parentElement;
      expect(addRow.querySelector('svg[icon="person-add"]')).to.exist;
      expect(env.queryByText('Switch')).to.be.null;
    });

    it('closes the menu and routes to /switch when Add is clicked', () => {
      env = mountMenu();
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
      env = mountMenu();
      const switchRow = env.getByText('Switch').parentElement;
      expect(switchRow.querySelector('svg[icon="people"]')).to.exist;
      expect(env.queryByText('Add')).to.be.null;
    });

    it('closes the menu and fires switchAccount with the other id when Switch is clicked', () => {
      const switchAccount = sinon.spy();
      env = mountMenu({ actions: { switchAccount } });
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
      env = mountMenu({ actions: { switchAccount } });
      fireEvent.click(env.getByText('Switch'));
      expect(switchAccount.args[0][1]).to.equal('5');
    });
  });

  describe('overlay', () => {
    it('closes the menu when the overlay is clicked', () => {
      env = mountMenu();
      fireEvent.click(env.host.querySelector('.modal-overlay'));
      expect(env.host.querySelector('.menu')).to.not.exist;
      expect(env.queryByText('Logout')).to.be.null;
    });
  });
});
