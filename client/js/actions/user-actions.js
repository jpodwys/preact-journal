import { clearData } from '../utils';
import xhr from '../api';
import { app, resetState } from '../app-state';
import { route } from '../../components/router';
import { loadAccount } from './entry-actions';


export function login (user){
  xhr('/api/user/login', { method: 'POST', body: user })
    .then(({ id, username }) => {
      app.accounts = [...app.accounts.filter(a => a.id !== id).map(a => ({ ...a, active: false })), { id, username, active: true }];
      activateAccount(id);
    });
};

function activateAccount (id, extra) {
  loadAccount(id, { userId: String(id), entryId: undefined, filter: '', filterText: '', ...extra })
    .then(() => route('/entries', true));
}

export function logout (){
  xhr('/api/user/logout', { method: 'POST' })
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
  activateAccount(account.id, { dialogMode: '' });
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
