import { get } from '../idb';
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

// After an account is removed or expires: switch to the first usable account, or start over at the sign-in route.
function switchToNext (accounts, wipe){
  const next = accounts.find(a => !a.expired);
  if(next) switchAccount(String(next.id));
  else {
    if(wipe) clearData();
    resetState();
    route('/');
  }
};

function logoutSuccess (){
  const userId = app.userId;
  const accounts = app.accounts.filter(a => String(a.id) !== userId);
  app.accounts = accounts;
  clearData(userId);
  switchToNext(accounts, 1);
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
  app.accounts = accounts;
  clearData(userId);
  switchToNext(accounts);
};
