import Entry from '../entry-service';
import { route } from 'preact-router';

const create = function(el, e){
  // el.setState({loading: el.state.loading + 1});
  // let entry = e.detail.entry;
  // Entry.create(entry).then(entry => {
  //   el.setState(Object.assign(el.state, {
  //     loading: el.state.loading - 1
  //   }));
  //   route('/entries');
  // }).catch(e => {
  //   console.log('error', e);
  // });
};

const get = function(el, e){
  
};

const update = function(el){
  // var length = el.state.items.length;
  // var last = 0;
  // if(length) last = el.state.items[length - 1];
  // el.setState({
  //   items: el.state.items.concat(last + 1)
  // });
};

const del = function(el, e){
  // let item = e.detail.item;
  // el.setState({
  //   items: el.state.items.filter( i => i !== item )
  // });
};

const getForUser = function(el){
  el.setState({loading: el.state.loading + 1});
  Entry.getForUser().then(response => {
    el.setState(Object.assign(el.state, {
      entries: response.entries,
      loading: el.state.loading - 1
    }));
  }).catch(e => {
    console.log('error', e);
  });
};

export default { create, get, update, del, getForUser };
