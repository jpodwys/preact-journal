import User from '../services/user-service';
// import { route } from 'preact-router';
import getInitialState from '../../js/app-state';

const clearLocalStorage = function(){
  localStorage.removeItem('entries');
  localStorage.removeItem('timestamp');
};

const login = function(el, e){
  clearLocalStorage();
  // el.setState({loading: el.state.loading + 1});
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
    // loading: el.state.loading - 1
  }, function(){
    // route('/entries');
  });
};

const loginFailure = function(el, err){
  // el.setState({loading: el.state.loading - 1});
  console.log('loginFailure', err);
};

const createAccount = function(el, e){
  clearLocalStorage();
  // el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.create(user).then(user => {
    createAccountSuccess(el, user);
  }).catch(err => {
    createAccountFailure(el, err);
  });
};

const createAccountSuccess = function(el, user){
  // el.setState({loading: el.state.loading - 1});
  // route('/entries');
};

const createAccountFailure = function(el, err){
  // el.setState({loading: el.state.loading - 1});
  console.log('createAccountFailure', err);
};

const logout = function(el, e){
  // el.setState({loading: el.state.loading + 1});
  User.logout().then(() => {
    logoutSuccess(el);
  }).catch(err => {
    logoutFailure(el, err);
  });
};

const logoutSuccess = function(el){
  clearLocalStorage();
  el.setState(getInitialState());
  // route('/');
};

const logoutFailure = function(el, err){
  // el.setState({loading: el.state.loading - 1});
  console.log('logoutFailure', err);
};

export default { login, createAccount, logout };
