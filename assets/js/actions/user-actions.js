import User from '../user-service';
import { route } from 'preact-router';
import getInitialState from '../../js/app-state';

const login = function(el, e){
  localStorage.clear();
  el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.login(user).then(user => {
    loginSuccess(el, user);
  }).catch(err => {
    loginFailure(el, err);
  });
};

const loginSuccess = function(el, user){
  /*
   * THIS SHOULD NOT NEED OBJECT.ASSIGN BUT IT DOES.
   * When I remove object.assing, entries is undefined.
   */
  el.setState(Object.assign(el.state, {
    loggedIn: true,
    loading: el.state.loading - 1
  }), function(){
    route('/entries');
  });
};

const loginFailure = function(el, err){
  el.setState({loading: el.state.loading - 1});
  console.log('loginFailure', err);
};

const createAccount = function(el, e){
  localStorage.clear();
  el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.create(user).then(user => {
    createAccountSuccess(el, user);
  }).catch(err => {
    createAccountFailure(el, err);
  });
};

const createAccountSuccess = function(el, user){
  el.setState({loading: el.state.loading - 1});
  route('/entries');
};

const createAccountFailure = function(el, err){
  el.setState({loading: el.state.loading - 1});
  console.log('createAccountFailure', err);
};

const logout = function(el, e){
  el.setState({loading: el.state.loading + 1});
  User.logout().then(() => {
    logoutSuccess(el);
  }).catch(err => {
    logoutFailure(el, err);
  });
};

const logoutSuccess = function(el){
  localStorage.clear();
  el.setState(getInitialState());
  route('/');
};

const logoutFailure = function(el, err){
  el.setState({loading: el.state.loading - 1});
  console.log('logoutFailure', err);
};

export default { login, createAccount, logout };
