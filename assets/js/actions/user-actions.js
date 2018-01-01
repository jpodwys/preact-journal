import User from '../user-service';
import { route } from 'preact-router';

const login = function(el, e){
  localStorage.clear();
  el.setState({
    entries: undefined,
    loading: el.state.loading - 1
  });
  el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.login(user).then(user => {
    el.setState(Object.assign(el.state, {
      loggedIn: true,
      loading: el.state.loading - 1
    }), function(){
      route('/entries');
    });
  }).catch(e => {
    console.log('error', e);
  });
};

const logout = function(el, e){
  el.setState({
    entries: undefined,
    loading: el.state.loading - 1
  });
};

export default { login, logout };
