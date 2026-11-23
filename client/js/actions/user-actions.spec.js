import fetchMock from 'fetch-mock';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { app } from '../app-state';
import { login, logout, switchAccount, handleExpiredSession } from './user-actions';
import {
  mockGetAllEntries,
  mockSyncEntries,
  mockLogin,
  mockLogout,
  lastBody
} from '../../../test/api-mocks';
import {
  resetAll, seed, preserveLocation, settleNetwork, eventually, tick, getAccountsFromStorage
} from './spec-helpers';

describe('userActions', () => {
  const USER = { username: 'bogus', password: 'value' };

  preserveLocation();
  beforeEach(() => resetAll());
  afterEach(() => fetchMock.restore());

  describe('login', () => {

    it('should log in, load the account\'s cached entries, reset per-account state, fetch, and route to /entries', async () => {
      await idbSet('entries_1', [{ id: 7, date: '2020-01-01', text: 'cached' }]);
      seed({ entry: { id: 5 }, entryIndex: 3, filter: 'favorites', filterText: 'x' });
      mockLogin({ id: 1, username: 'bogus' });
      mockGetAllEntries({ entries: [], timestamp: 1 });

      login(USER);
      await eventually(() => expect(app.loggedIn).to.be.true);

      expect(lastBody('/api/user/login')).to.deep.equal(USER);
      expect(app.userId).to.equal('1');
      expect(app.username).to.equal('bogus');
      expect(app.entries.map(e => e.id)).to.deep.equal([7]);
      expect(app.entry).to.be.undefined;
      expect(app.entryIndex).to.equal(-1);
      expect(app.filter).to.equal('');
      expect(app.filterText).to.equal('');
      // what the old `.set` callback did: fetch entries and route
      expect(location.pathname).to.equal('/entries');
      await settleNetwork();
      expect(fetchMock.called('/api/entries')).to.be.true;
      expect(app.timestamp).to.equal(1);
    });

    it('should add the account to localStorage and deactivate other accounts', async () => {
      app.accounts = [{ id: 5, username: 'other', active: true }];
      mockLogin({ id: 1, username: 'bogus' });
      mockGetAllEntries();

      login(USER);
      await eventually(() => expect(app.userId).to.equal('1'));

      const accounts = getAccountsFromStorage();
      expect(accounts.length).to.equal(2);
      const newAcct = accounts.find(a => a.id === 1);
      const oldAcct = accounts.find(a => a.id === 5);
      expect(newAcct.active).to.be.true;
      expect(newAcct.username).to.equal('bogus');
      expect(oldAcct.active).to.be.false;
    });

    it('should leave state and accounts alone when login fails', async () => {
      // login() has no .catch (the Login form keeps its own UI); swallow the
      // resulting unhandled rejection so it does not fail the run.
      const swallow = e => e.preventDefault();
      window.addEventListener('unhandledrejection', swallow);
      try {
        mockLogin({ httpStatus: 400 });
        login(USER);
        await settleNetwork();
        expect(app.loggedIn).to.be.false;
        expect(app.userId).to.equal('');
        expect(localStorage.getItem('accounts')).to.be.null;
      } finally {
        await tick(10);
        window.removeEventListener('unhandledrejection', swallow);
      }
    });

  });

  describe('logout', () => {

    it('should clear storage, reset state, and route back to / when it was the only account', async () => {
      await resetAll({ accounts: [{ id: 99, username: 'current', active: true }] });
      await idbSet('entries_99', [{ id: 1 }]);
      localStorage.setItem('bogus', 'value');
      seed({ entries: [{ id: 1, date: '2020-01-01', text: 'a' }] });
      mockLogout();

      logout();
      await settleNetwork();

      expect(localStorage.getItem('bogus')).to.be.null;
      expect(localStorage.getItem('accounts')).to.be.null;
      expect(app.loggedIn).to.be.false;
      expect(app.userId).to.equal('');
      expect(app.entries).to.deep.equal([]);
      expect(location.pathname).to.equal('/');
      await eventually(async () => expect(await idbGet('entries_99')).to.be.undefined);
    });

    it('should not clear localStorage or state when logout fails', async () => {
      await resetAll({ accounts: [{ id: 99, username: 'current', active: true }] });
      localStorage.setItem('bogus', 'value');
      mockLogout({ httpStatus: 400 });
      const swallow = e => e.preventDefault();
      window.addEventListener('unhandledrejection', swallow);
      try {
        logout();
        await settleNetwork();
        expect(localStorage.getItem('bogus')).to.equal('value');
        expect(app.loggedIn).to.be.true;
        expect(app.userId).to.equal('99');
      } finally {
        await tick(10);
        window.removeEventListener('unhandledrejection', swallow);
      }
    });

    it('should remove the account from localStorage entirely and switch to the remaining account', async () => {
      await resetAll({ accounts: [
        { id: 99, username: 'current', active: true },
        { id: 50, username: 'other', active: false }
      ] });
      localStorage.setItem('timestamp_99', '5');
      mockLogout();
      mockGetAllEntries();

      logout();
      await eventually(() => expect(app.userId).to.equal('50'));

      const remaining = getAccountsFromStorage();
      expect(remaining.length).to.equal(1);
      expect(remaining[0].id).to.equal(50);
      expect(remaining[0].active).to.be.true;
      expect(app.username).to.equal('other');
      expect(app.loggedIn).to.be.true;
      expect(localStorage.getItem('timestamp_99')).to.be.null;
      expect(location.pathname).to.equal('/entries');
    });

  });

  describe('switchAccount', () => {

    it('should switch to another account, update localStorage, and load that account\'s cache', async () => {
      await resetAll({ accounts: [
        { id: 1, username: 'current', active: true },
        { id: 2, username: 'other', active: false }
      ] });
      await idbSet('entries_2', [{ id: 22, date: '2020-01-01', text: 'two' }]);
      localStorage.setItem('timestamp_2', '1234');
      seed({ dialogMode: 'modal:switch' });
      mockSyncEntries({ entries: [], timestamp: 4321 });

      switchAccount('2');
      await eventually(() => expect(app.userId).to.equal('2'));

      const updated = getAccountsFromStorage();
      expect(updated.find(a => a.id === 2).active).to.be.true;
      expect(updated.find(a => a.id === 1).active).to.be.false;
      expect(app.username).to.equal('other');
      expect(app.dialogMode).to.equal('');
      expect(app.entries.map(e => e.id)).to.deep.equal([22]);
      // the account's stored timestamp was loaded, so getEntries syncs from it
      await settleNetwork();
      expect(fetchMock.lastUrl()).to.equal('/api/entries/sync/1234');
      expect(app.timestamp).to.equal(4321);
    });

    it('should do nothing when the account is not found', async () => {
      await resetAll({ accounts: [{ id: 1, username: 'current', active: true }] });
      switchAccount('999');
      await tick(20);
      expect(app.userId).to.equal('1');
      expect(getAccountsFromStorage()[0].active).to.be.true;
    });

  });

  describe('handleExpiredSession', () => {
    const TWO = [
      { id: 1, username: 'expired-user', active: true },
      { id: 2, username: 'valid-user', active: false }
    ];

    it('should do nothing when userId does not match current state', async () => {
      await resetAll({ accounts: TWO });
      seed({ filterText: 'kept', dialogMode: 'menu' });
      const path = location.pathname;
      handleExpiredSession('999');
      await tick(20);
      expect(getAccountsFromStorage()).to.deep.equal(TWO);
      expect(app.userId).to.equal('1');
      // no account re-activation either
      expect(app.filterText).to.equal('kept');
      expect(app.dialogMode).to.equal('menu');
      expect(location.pathname).to.equal(path);
    });

    it('should do nothing when userId is falsey', async () => {
      await resetAll({ accounts: TWO });
      seed({ filterText: 'kept', dialogMode: 'menu' });
      const path = location.pathname;
      handleExpiredSession('');
      await tick(20);
      expect(getAccountsFromStorage()).to.deep.equal(TWO);
      expect(app.userId).to.equal('1');
      // no account re-activation either
      expect(app.filterText).to.equal('kept');
      expect(app.dialogMode).to.equal('menu');
      expect(location.pathname).to.equal(path);
    });

    it('should mark the account as expired, drop its cache, and switch to the next valid account', async () => {
      await resetAll({ accounts: TWO });
      await idbSet('entries_1', [{ id: 1 }]);
      localStorage.setItem('timestamp_1', '9');
      mockGetAllEntries();

      handleExpiredSession('1');
      await eventually(() => expect(app.userId).to.equal('2'));

      const updated = getAccountsFromStorage();
      const expired = updated.find(a => a.id === 1);
      expect(expired.expired).to.be.true;
      expect(expired.active).to.be.false;
      expect(updated.find(a => a.id === 2).active).to.be.true;
      expect(app.username).to.equal('valid-user');
      expect(localStorage.getItem('timestamp_1')).to.be.null;
      expect(await idbGet('entries_1')).to.be.undefined;
    });

    it('should reset to the login screen when no valid accounts remain', async () => {
      await resetAll({ accounts: [{ id: 1, username: 'only-user', active: true }] });
      seed({ entries: [{ id: 1, date: '2020-01-01', text: 'a' }] });

      handleExpiredSession('1');

      expect(app.loggedIn).to.be.false;
      expect(app.userId).to.equal('');
      expect(app.entries).to.deep.equal([]);
      expect(location.pathname).to.equal('/');
      // the expired account is remembered (so Login can offer to re-auth it)
      expect(getAccountsFromStorage()).to.deep.equal([
        { id: 1, username: 'only-user', active: false, expired: true }
      ]);
    });

  });

});
