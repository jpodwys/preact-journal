import User from '../user-service';
import { route } from 'preact-router';

const login = function(el, e){
  el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.login(user).then(user => {
    el.setState(Object.assign(el.state, {
      loading: el.state.loading - 1
    }));
    route('/entries');
  }).catch(e => {
    console.log('error', e);
  });
};

const addItem = function(el){
  var length = el.state.items.length;
  var last = 0;
  if(length) last = el.state.items[length - 1];
  el.setState({
    items: el.state.items.concat(last + 1)
  });
};

const removeItem = function(el, e){
  let item = e.detail.item;
  el.setState({
    items: el.state.items.filter( i => i !== item )
  });
};

export default { login, addItem, removeItem };
