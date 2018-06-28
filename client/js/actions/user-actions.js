import User from '../services/user-service';
import getInitialState from '../app-state';
import { route } from '../../components/router';
import { clearLocalStorage } from '../utils';

function login (el, user){
  clearLocalStorage();
  User.login(user).then(user => {
    loginSuccess(el, user);
  }).catch(err => {
    loginFailure(el, err);
  });
};

function loginSuccess (el, user){
  el.setState({
    loggedIn: true,
  }, function(){
    route('/entries', true);
  });
};

function loginFailure (el, err){
  console.log('loginFailure', err);
};

function createAccount (el, user){
  clearLocalStorage();
  User.create(user).then(user => {
    loginSuccess(el, user);
  }).catch(err => {
    createAccountFailure(el, err);
  });
};

function createAccountFailure (el, err){
  console.log('createAccountFailure', err);
};

function logout (el){
  User.logout().then(() => {
    logoutSuccess(el);
  }).catch(err => {
    logoutFailure(el, err);
  });
};

function logoutSuccess (el){
  clearLocalStorage();
  el.setState(getInitialState());
  route('/');
};

function logoutFailure (el, err){
  console.log('logoutFailure', err);
};

export default { login, createAccount, logout };
