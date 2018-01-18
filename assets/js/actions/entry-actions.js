import Entry from '../entry-service';
import { route } from 'preact-router';
import debounce from '../debounce';
import { findObjectIndexById, removeObjectByIndex } from '../utils';

let fetched = false;

const fetchData = function(el, e){
  if(!el.state.loggedIn) return;
  if(fetched) return;
  fetched = true;
  let timestamp = localStorage.getItem('timestamp');
  if(timestamp){
    syncForUser(el, {detail: {timestamp: timestamp}});
  } else {
    getAllForUser(el);
  }
};

const slowCreate = function(el, e){
  // return console.log(e.detail);

  let entry = e.detail.entry;
  if(entry.postPending) return;

  el.state.entries[e.detail.entryIndex].postPending = true;

  el.setState({
    loading: el.state.loading + 1,
    entry: entry,
    entries: [].concat(el.state.entries)
  });

  Entry.create(entry).then(response => {
    el.state.entry.id = response.id;
    el.state.entries[0].id = response.id;
    delete el.state.entries[0].postPending;
    delete el.state.entries[0].newEntry;
    delete el.state.entries[0].needsSync;

    el.setState({
      loading: el.state.loading - 1,
      entry: Object.assign({}, el.state.entry),
      entries: [].concat(el.state.entries)
    });
  }).catch(e => {
    console.log('error', e);
  });
};

const create = debounce(slowCreate, 500);

const get = function(el, e){
  
};

const slowUpdate = function(el, e){
  var d = e.detail;
  var val = d.entry[d.property];
  if(typeof val === 'string'){
    val = val.trim();
  }

  d.entry[d.property] = d.entry[d.property];
  var current = el.state.entries[d.entryIndex][d.property];
  var next = d.entry[d.property];
  if(current === next) return;

  el.state.entries[d.entryIndex][d.property] = d.entry[d.property];
  // el.state.entries[d.entryIndex].needsSync = true;
  el.setState({
    entries: [].concat(el.state.entries)
  }, function(){
    localStorage.setItem('entries', JSON.stringify(el.state.entries));
  });

  el.state.entries[d.entryIndex].needsSync = true;

  if(d.entry.newEntry){
    if(d.entry.postPending) return;
    el.state.entries[d.entryIndex].postPending = true;

    Entry.create(d.entry).then(function(response){
      console.log(response)
    }).catch(function(err){

    });
  } else {
    Entry.update(d.entry).then(function(){
      
    }).catch(function(err){

    });
  }
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
      if(el.view === '/entry' && el.state.entryId){
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

  // console.log('e', e)
  // console.log('id', e.detail.id)
  // console.log('entryIndex', entryIndex)
  // console.log('entry', entry)
  // console.log('entries', el.state.entries)
  // console.log('entryReady', entryReady)

  el.setState({
    entry: entry,
    entryIndex: entryIndex,
    entryReady: entryReady
  });
};

const newEntry = function(el){
  /*
    Generate a new empty entry object
    Unshift it onto entries
    Set entryIndex to 0
  */
  var newEntry = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    text: '',
    isPublic: 0,
    // isOwner: true,
    needsSync: true,
    newEntry: true
  };

  el.setState({
    entryIndex: 0,
    entries: [newEntry].concat(el.state.entries)
  }, function(){
    setEntry(el, {detail: {id: newEntry.id, entryReady: true}});
    // route('/entry/' + newEntry.id);
  });
};

export default { fetchData, create, get, update, del, getAllForUser, syncForUser, setEntry, newEntry };
