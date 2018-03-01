import User from '../services/user-service';
import getInitialState from '../app-state';
import fire from '../fire';

const clearLocalStorage = function(){
  localStorage.removeItem('entries');
  localStorage.removeItem('timestamp');
};

const login = function(el, e){
  clearLocalStorage();
  let user = e.detail.user;
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
    fire('route', {href: '/entries'})();
  });
};

const loginFailure = function(el, err){
  console.log('loginFailure', err);
};

const createAccount = function(el, e){
  console.log('createAccount')
  clearLocalStorage();
  let user = e.detail.user;
  User.create(user).then(user => {
    createAccountSuccess(el, user);
  }).catch(err => {
    createAccountFailure(el, err);
  });
};

const createAccountSuccess = function(el, user){
    fire('route', {href: '/entries'})();
};

const createAccountFailure = function(el, err){
  console.log('createAccountFailure', err);
};

const logout = function(el, e){
  User.logout().then(() => {
    logoutSuccess(el);
  }).catch(err => {
    logoutFailure(el, err);
  });
};

const logoutSuccess = function(el){
  clearLocalStorage();
  el.setState(getInitialState());
  fire('route', {href: '/'})();
};

const logoutFailure = function(el, err){
  console.log('logoutFailure', err);
};

export default { login, createAccount, logout };
