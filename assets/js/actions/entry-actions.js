import Entry from '../entry-service';
import { route } from 'preact-router';
import debounce from '../debounce';

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

const slowUpdate = function(el, e){
  var d = e.detail;

  d.entry[d.property] = d.entry[d.property].trim();
  var current = el.state.entries[d.entryIndex][d.property];
  var next = d.entry[d.property];
  if(current === next) return;

  el.state.entries[d.entryIndex][d.property] = d.entry[d.property];
  el.setState({
    entries: [].concat(el.state.entries)
  }, function(){
    localStorage.setItem('entries', JSON.stringify(el.state.entries));
  });

  Entry.update(d.entry).then(function(){

  }).catch(function(err){

  });
};

const update = debounce(slowUpdate, 500);

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

const getAllForUser = function(el){
  if(el.state.entries.length) return;
  el.setState({loading: el.state.loading + 1});
  Entry.getAllForUser().then(response => {
    el.setState(Object.assign(el.state, {
      entries: response.entries,
      loading: el.state.loading - 1
    }));
    localStorage.setItem('entries', JSON.stringify(response.entries));
  }).catch(e => {
    console.log('error', e);
  });
};

const setEntry = function(el, e){
  if(!e || !e.detail || !e.detail.id) return;
  var entries = el.state.entries;
  var index = 0;
  while(index < entries.length){
    if(entries[index].id.toString() === e.detail.id.toString()){
      break;
    }
    index++
  }
  el.setState({
    entryIndex: index,
    entry: entries[index]
  });
};

export default { create, get, update, del, getForUser, getAllForUser, setEntry };
