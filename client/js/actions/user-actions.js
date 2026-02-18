import { get } from 'idb-keyval';
import { clearData } from '../utils';
import User from '../services/user-service';
import getInitialState from '../app-state';
import { route } from '../../components/router';
import { fire } from '../../components/unifire';

function getAccounts () {
  try {
    return JSON.parse(localStorage.getItem('accounts')) || [];
  } catch(e) {
    return [];
  }
}

function saveAccounts (accounts) {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

function setActiveAccount (accounts, id) {
  return accounts.map(a => Object.assign({}, a, { active: a.id === id }));
}

function login (el, user){
  User.login(user)
    .then(data => loginSuccess(el, data))
    .catch(err => loginFailure(el, err));
};

function loginSuccess (el, { id, username }){
  var accounts = getAccounts().filter(a => a.id !== id);
  accounts.push({ id, username, active: true });
  accounts = setActiveAccount(accounts, id);
  saveAccounts(accounts);

  el.set(
    { loggedIn: true, userId: String(id), username },
    () => {
      fire('getEntries');
      route('/entries', true);
    }
  );
};

function loginFailure (el, err){
  console.log('loginFailure', err);
};

function createAccount (el, user){
  User.create(user)
    .then(data => loginSuccess(el, data))
    .catch(err => createAccountFailure(el, err));
};

function createAccountFailure (el, err){
  console.log('createAccountFailure', err);
};

function logout (el){
  User.logout()
    .then(() => logoutSuccess(el))
    .catch(err => logoutFailure(el, err));
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

function logoutFailure (el, err){
  console.log('logoutFailure', err);
};

function switchAccount (el, userId) {
  User.switchAccount(userId)
    .then(data => switchAccountSuccess(el, data))
    .catch(err => switchAccountFailure(el, userId, err));
};

function switchAccountSuccess (el, { id, username }) {
  var accounts = setActiveAccount(getAccounts(), id);
  saveAccounts(accounts);

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
      dialogMode: '',
      filter: '',
      filterText: ''
    }, () => {
      fire('getEntries');
      route('/entries', true);
    });
  });
};

function switchAccountFailure (el, userId, err) {
  var accounts = getAccounts().map(a =>
    String(a.id) === String(userId) ? Object.assign({}, a, { expired: true }) : a
  );
  saveAccounts(accounts);
  el.set({ toast: 'Session expired. Please log in again.' });
};

function handleExpiredSession (el, userId) {
  if(!userId || el.state.userId !== userId) return;

  var accounts = getAccounts().map(a =>
    String(a.id) === userId ? Object.assign({}, a, { expired: true, active: false }) : a
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

export default { login, createAccount, logout, switchAccount, handleExpiredSession };
