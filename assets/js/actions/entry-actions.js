import Entry from '../entry-service';
import { route } from 'preact-router';
import debounce from '../debounce';

var findObjectIndexById = function(id, list) {
  return list.map(function(obj){ return obj.id; }).indexOf(id);
};

var removeObjectByIndex = function(index, list) {
  return list.splice(index, 1);
};

const create = function(el, e){
  el.setState({loading: el.state.loading + 1});
  let entry = e.detail.entry;
  Entry.create(entry).then(response => {
    entry.id = response.id;
    el.setState({
      loading: el.state.loading - 1,
      entries: [entry].concat(el.state.entries)
    });
    route('/entries');
  }).catch(e => {
    console.log('error', e);
  });
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

const getAllForUser = function(el){
  if(el.state.entries) return;
  el.setState({loading: el.state.loading + 1});
  Entry.getAllForUser().then(response => {
    el.setState({
      entries: response.entries,
      loading: el.state.loading - 1
    }, function(){
      setEntry(el, {detail: {id: el.state.entryId, entryReady: true}});
      localStorage.setItem('entries', JSON.stringify(response.entries));
      localStorage.setItem('timestamp', response.timestamp);
    });
  }).catch(e => {
    console.log('error', e);
  });
};

const syncForUser = function(el, e){
  el.setState({loading: el.state.loading + 1});
  Entry.syncForUser(e.detail.timestamp).then(response => {

    if(response.entries.length === 0){
      el.setState({
        loading: el.state.loading - 1,
      });
      localStorage.setItem('timestamp', response.timestamp);
      return;
    }

    response.entries.forEach((entry, i) => {
      var entryIndex = findObjectIndexById(entry.id, el.state.entries);
      if(entryIndex > -1){
        if(entry.deleted) el.state.entries = removeObjectByIndex(entryIndex, el.state.entries);
        else el.state.entries[entryIndex] = entry;
      } else {
        el.state.entries.unshift(entry);
      }
    });

    el.setState({
      loading: el.state.loading - 1,
      entries: [].concat(el.state.entries)
    }, function(){
      if(el.route === '/entry' && el.state.entryId){
        setEntry(el, {detail: {id: el.state.entryId, entryReady: true}});
      }
      localStorage.setItem('entries', JSON.stringify(el.state.entries));
      localStorage.setItem('timestamp', response.timestamp);
    });
  }).catch(e => {
    console.log('error', e);
  });
};

const setEntry = function(el, e){
  if(!el.state.entries || !e || !e.detail || !e.detail.id || e.detail.id === -1) return;

  var entryIndex = findObjectIndexById(parseInt(e.detail.id, 10), el.state.entries);
  var entry = el.state.entries[entryIndex];
  var entryReady = !!entry || !!e.detail.entryReady;

  el.setState({
    entry: entry,
    entryIndex: entryIndex,
    entryReady: entryReady
  });
};

export default { create, get, update, del, getAllForUser, syncForUser, setEntry };
