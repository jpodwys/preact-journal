import { get } from 'idb-keyval';
import { clearData } from '../utils';
import User from '../services/user-service';
import { app, resetState } from '../app-state';
import { route } from '../../components/router';
import { getEntries, resetDataFetched } from './entry-actions';

const set = delta => Object.assign(app, delta);

export function login (user){
  User.login(user)
    .then(loginSuccess);
};

function activateAccount ({ id, username }, extra) {
  resetDataFetched();

  get('entries_' + id).then((entries = []) => {
    const timestamp = localStorage.getItem('timestamp_' + id) || undefined;

    set({
      userId: String(id),
      username,
      entries,
      timestamp,
      entry: undefined,
      entryIndex: -1,
      filter: '',
      filterText: '',
      ...extra
    });
    getEntries();
    route('/entries', true);
  });
}

function loginSuccess ({ id, username }){
  app.accounts = [...app.accounts.filter(a => a.id !== id).map(a => ({ ...a, active: false })), { id, username, active: true }];
  activateAccount({ id, username }, { loggedIn: true });
};

export function logout (){
  User.logout()
    .then(() => logoutSuccess());
};

function logoutSuccess (){
  const userId = app.userId;
  const accounts = app.accounts.filter(a => String(a.id) !== userId);
  app.accounts = accounts;
  clearData(userId);

  const valid = accounts.filter(a => !a.expired);
  if(valid.length > 0) {
    switchAccount(String(valid[0].id));
  } else {
    clearData();
    resetState();
    route('/');
  }
};

export function switchAccount (userId) {
  const account = app.accounts.find(a => String(a.id) === String(userId));
  if(!account) return;
  app.accounts = app.accounts.map(a => ({ ...a, active: a.id === account.id }));
  activateAccount({ id: account.id, username: account.username }, { dialogMode: '' });
};

export function handleExpiredSession (userId) {
  if(!userId || app.userId !== userId) return;

  const accounts = app.accounts.map(a =>
    String(a.id) === userId ? {...a, expired: true, active: false} : a
  );
  const remaining = accounts.filter(a => !a.expired);
  app.accounts = accounts;
  clearData(userId);

  if(remaining.length > 0) {
    switchAccount(String(remaining[0].id));
  } else {
    resetState();
    route('/');
  }
};
