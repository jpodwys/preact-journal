import User from '../services/user-service';
import getInitialState from '../app-state';
import { route } from '../../components/router';
import { clearLocalStorage } from '../utils';

const login = function(el, user){
  clearLocalStorage();
  User.login(user).then(user => {
    loginSuccess(el, user);
  }).catch(err => {
    loginFailure(el, err);
  });
};

const loginSuccess = function(el, user){
  el.setState({
    loggedIn: true,
  }, function(){
    route('/entries', true);
  });
};

const loginFailure = function(el, err){
  console.log('loginFailure', err);
};

const createAccount = function(el, user){
  clearLocalStorage();
  User.create(user).then(user => {
    loginSuccess(el, user);
  }).catch(err => {
    createAccountFailure(el, err);
  });
};

const createAccountFailure = function(el, err){
  console.log('createAccountFailure', err);
};

const logout = function(el){
  User.logout().then(() => {
    logoutSuccess(el);
  }).catch(err => {
    logoutFailure(el, err);
  });
};

const logoutSuccess = function(el){
  clearLocalStorage();
  el.setState(getInitialState());
  route('/');
};

const logoutFailure = function(el, err){
  console.log('logoutFailure', err);
};

export default { login, createAccount, logout };
