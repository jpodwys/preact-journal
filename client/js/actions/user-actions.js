import { clearData } from '../utils';
import User from '../services/user-service';
import getInitialState from '../app-state';
import { route } from '../../components/router';
import { fire } from '../../components/unifire';

function login (el, user){
  User.login(user)
    .then(() => loginSuccess(el))
    .catch(console.log);
};

function loginSuccess (el){
  el.set(
    { loggedIn: true },
    () => {
      fire('getEntries');
      route('/entries', true);
    }
  );
};

function createAccount (el, user){
  User.create(user)
    .then(() => loginSuccess(el))
    .catch(console.log);
};

function logout (el){
  User.logout()
    .then(() => logoutSuccess(el))
    .catch(console.log);
};

function logoutSuccess (el){
  clearData();
  el.set(getInitialState());
  route('/');
};

export default { login, createAccount, logout };
