import User from './user-actions';
import Entry from './entry-actions';

const actions = {
  linkstate: function(el, e){
    let obj = {};
    obj[e.detail.key] = e.detail.val;
    el.setState(obj, e.detail.cb);
  }
};

export default Object.assign(User, Entry, actions);