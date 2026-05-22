import { get } from 'idb-keyval';
import { clearData, getAccounts, saveAccounts } from '../utils';
import User from '../services/user-service';
import getInitialState from '../app-state';
import { route } from '../../components/router';
import { fire } from '../../components/unifire';

function login (el, user){
  User.login(user)
    .then(({ data }) => loginSuccess(el, data));
};

function activateAccount (el, { id, username }, extra) {
  fire('resetDataFetched');

  get('entries_' + id).then((entries = []) => {
    var timestamp = localStorage.getItem('timestamp_' + id) || undefined;

    el.set({
      userId: String(id),
      username,
      entries,
      timestamp,
      entry: undefined,
      entryIndex: -1,
      filter: '',
      filterText: '',
      ...extra
    }, () => {
      fire('getEntries');
      // Route to '/' so the login guard immediately bounces to '/entries',
      // remounting the entries list and replaying the fade-down animation.
      route('/', true);
    });
  });
}

function loginSuccess (el, { id, username }){
  var accounts = getAccounts().filter(a => a.id !== id);
  accounts.forEach(a => { a.active = false; });
  accounts.push({ id, username, active: true });
  saveAccounts(accounts);
  activateAccount(el, { id, username }, { loggedIn: true });
};

function logout (el){
  User.logout()
    .then(() => logoutSuccess(el));
};

function logoutSuccess (el){
  var userId = el.state.userId;
  var accounts = getAccounts().filter(a => String(a.id) !== userId);
  saveAccounts(accounts);
  clearData(userId);

  var valid = accounts.filter(a => !a.expired);
  if(valid.length > 0) {
    switchAccount(el, String(valid[0].id));
  } else {
    clearData();
    el.set(getInitialState());
    route('/');
  }
};

function switchAccount (el, userId) {
  var accounts = getAccounts();
  var account = accounts.find(a => String(a.id) === String(userId));
  if(!account) return;
  accounts.forEach(a => { a.active = a.id === account.id; });
  saveAccounts(accounts);
  activateAccount(el, { id: account.id, username: account.username }, { dialogMode: '' });
};

function handleExpiredSession (el, userId) {
  if(!userId || el.state.userId !== userId) return;

  var accounts = getAccounts().map(a =>
    String(a.id) === userId ? {...a, expired: true, active: false} : a
  );
  var remaining = accounts.filter(a => !a.expired);
  saveAccounts(accounts);
  clearData(userId);

  if(remaining.length > 0) {
    switchAccount(el, String(remaining[0].id));
  } else {
    el.set(getInitialState());
    route('/');
  }
};

export default { login, logout, switchAccount, handleExpiredSession };
