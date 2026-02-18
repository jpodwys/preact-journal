import { h } from 'preact';
import { Provider, fire } from '../unifire';
import DialogWrapper from './index';

describe('dialogWrapper', () => {
  let actions;

  function setAccounts (accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }

  function getMenu (overrides) {
    var props = Object.assign({
      dialogMode: 'menu',
      dark: false,
      view: '/entries',
      sort: 'desc',
      userId: '1',
      username: 'testuser'
    }, overrides);
    var vnode = DialogWrapper(props);
    // vnode is Dialog > ul.menu
    return vnode.children[0];
  }

  function findLi (menu, text) {
    return menu.children.find(li =>
      li && li.children && li.children.some && li.children.some(c =>
        c && c.children && c.children[0] === text
      )
    );
  }

  function getIcon (li) {
    var svg = li.children.find(c => c && c.attributes && c.attributes.icon);
    return svg && svg.attributes.icon;
  }

  beforeEach(() => {
    localStorage.clear();
    actions = {
      linkstate: sinon.spy(),
      switchAccount: sinon.spy()
    };
    new Provider({ state: {}, actions, children: [] });
  });

  describe('menu username', () => {

    it('should render the username as the first menu item', () => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
      var menu = getMenu();
      var firstLi = menu.children[0];
      expect(firstLi.attributes.class).to.equal('menu-username');
      expect(firstLi.children[0]).to.equal('testuser');
    });

    it('should render the correct username when changed', () => {
      setAccounts([{ id: 1, username: 'alice', active: true }]);
      var menu = getMenu({ username: 'alice' });
      var firstLi = menu.children[0];
      expect(firstLi.children[0]).to.equal('alice');
    });

  });

  describe('single account - Add button', () => {

    beforeEach(() => {
      setAccounts([{ id: 1, username: 'testuser', active: true }]);
    });

    it('should show "Add" with person-add icon when only one account is logged in', () => {
      var menu = getMenu();
      var addLi = findLi(menu, 'Add');
      expect(addLi).to.exist;
      expect(getIcon(addLi)).to.equal('person-add');
    });

    it('should not show "Switch" when only one account is logged in', () => {
      var menu = getMenu();
      var switchLi = findLi(menu, 'Switch');
      expect(switchLi).to.be.undefined;
    });

    it('should close the menu and route to /switch when Add is clicked', () => {
      var menu = getMenu();
      var addLi = findLi(menu, 'Add');
      addLi.attributes.onclick();
      expect(actions.linkstate.calledOnce).to.be.true;
      expect(actions.linkstate.args[0][1].key).to.equal('dialogMode');
    });

  });

  describe('two accounts - Switch button', () => {

    beforeEach(() => {
      setAccounts([
        { id: 1, username: 'testuser', active: true },
        { id: 2, username: 'other', active: false }
      ]);
    });

    it('should show "Switch" with people icon when two accounts are logged in', () => {
      var menu = getMenu();
      var switchLi = findLi(menu, 'Switch');
      expect(switchLi).to.exist;
      expect(getIcon(switchLi)).to.equal('people');
    });

    it('should not show "Add" when two accounts are logged in', () => {
      var menu = getMenu();
      var addLi = findLi(menu, 'Add');
      expect(addLi).to.be.undefined;
    });

    it('should close the menu and fire switchAccount with the other account id when Switch is clicked', () => {
      var menu = getMenu();
      var switchLi = findLi(menu, 'Switch');
      switchLi.attributes.onclick();
      expect(actions.linkstate.calledOnce).to.be.true;
      expect(actions.linkstate.args[0][1].key).to.equal('dialogMode');
      expect(actions.switchAccount.calledOnce).to.be.true;
      expect(actions.switchAccount.args[0][1]).to.equal('2');
    });

    it('should switch to the correct account regardless of order', () => {
      setAccounts([
        { id: 5, username: 'other', active: false },
        { id: 1, username: 'testuser', active: true }
      ]);
      var menu = getMenu();
      var switchLi = findLi(menu, 'Switch');
      switchLi.attributes.onclick();
      expect(actions.switchAccount.args[0][1]).to.equal('5');
    });

  });

  describe('returns nothing when dialogMode is falsey', () => {

    it('should return undefined when dialogMode is empty', () => {
      var result = DialogWrapper({ dialogMode: '' });
      expect(result).to.be.undefined;
    });

  });

});
