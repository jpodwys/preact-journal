import User from '../user-service';

const login = function(el, e){
  el.setState({loading: el.state.loading + 1});
  let user = e.detail.user;
  User.login(user).then(user => {
    el.setState(Object.assign(el.state, {
      loading: el.state.loading - 1
    }));
  }).catch(e => {
    console.log('error', e);
  });
};

const addItem = function(el){
  el.setState({loading: el.state.loading + 1});
  setTimeout(() => {
    var length = el.state.items.length;
    var last = 0;
    if(length) last = el.state.items[length - 1];
    el.setState({
      loading: el.state.loading - 1,
      items: el.state.items.concat(last + 1)
    });
  }, 250);
};

const removeItem = function(el, e){
  el.setState({loading: el.state.loading + 1});
  let item = e.detail.item;
  setTimeout(() => {
    el.setState({
      loading: el.state.loading - 1,
      items: el.state.items.filter( i => i !== item )
    });
  }, 250);
};

export default { login, addItem, removeItem };
