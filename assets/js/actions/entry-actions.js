import Entry from '../entry-service';
import { route } from 'preact-router';
import debounce from '../debounce';
import { findObjectIndexById, removeObjectByIndex } from '../utils';
import persist from '../persist';

let dataFetched = false;

const getEntries = function(el, e){
  if(!el.state.loggedIn) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  let timestamp = localStorage.getItem('timestamp');
  if(timestamp){
    syncEntries(el, {detail: {timestamp: timestamp}});
  } else {
    getAllEntries(el);
  }
};

const getAllEntries = function(el){
  if(el.state.entries) return;
  el.setState({loading: el.state.loading + 1});
  Entry.getAll().then(response => {
    getAllEntriesSuccess(el, response);
  }).catch(err => {
    getAllEntriesError(el, err);
  });
};

const getAllEntriesSuccess = function(el, response){
  persist(el, {
    entries: response.entries,
    loading: el.state.loading - 1
  }, function(){
    setEntry(el, {detail: {id: el.state.entryId, entryReady: true}});
    localStorage.setItem('timestamp', response.timestamp);
  });
};

const getAllEntriesError = function(el, err){
  el.setState({loading: el.state.loading - 1});
  console.log('getAllEntriesError', err)
};

const syncEntries = function(el, e){
  el.setState({loading: el.state.loading + 1});
  Entry.sync(e.detail.timestamp).then(response => {
    syncEntriesSuccess(el, response);
  }).catch(err => {
    syncEntriesFailure(el, err);
  });
};

const syncEntriesSuccess = function(el, response){
  if(response.entries.length === 0){
    el.setState({
      loading: el.state.loading - 1,
    });
    localStorage.setItem('timestamp', response.timestamp);
    return;
  }

  applySyncPatch(el, response.entries);
  persistSyncPatch(el, response.timestamp);
};

const applySyncPatch = function(el, entries){
  entries.forEach((entry, i) => {
    var entryIndex = findObjectIndexById(entry.id, el.state.entries);
    if(entryIndex > -1){
      if(entry.deleted) el.state.entries = removeObjectByIndex(entryIndex, el.state.entries);
      else el.state.entries[entryIndex] = entry;
    } else {
      el.state.entries.unshift(entry);
    }
  });
};

const persistSyncPatch = function(el, timestamp){
  persist(el, {
    loading: el.state.loading - 1,
    entries: [].concat(el.state.entries)
  }, function(){
    if(el.view === '/entry' && el.state.entryId){
      setEntry(el, {detail: {id: el.state.entryId, entryReady: true}});
    }
    localStorage.setItem('timestamp', timestamp);
  });
};

const syncEntriesFailure = function(el, err){
  el.setState({loading: el.state.loading - 1});
  console.log('syncEntriesFailure', err)
};

const getEntry = function(el, e){
  
};

const slowCreate = function(el, e){
  let entry = e.detail.entry;
  if(entry.postPending) return;

  el.state.entries[e.detail.entryIndex].postPending = true;

  el.setState({
    loading: el.state.loading + 1,
    entry: entry,
    entries: [].concat(el.state.entries)
  });

  Entry.create(entry).then(response => {
    slowCreateSuccess(el, response);
  }).catch(err => {
    slowCreateFailure(el, err);
  });
};

const createEntry = debounce(slowCreate, 500);

const slowCreateSuccess = function(el, response){
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
};

const slowCreateFailure = function(el, err){
  console.log('slowCreateFailure', err);
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
  persist(el, {
    entries: [].concat(el.state.entries)
  });

  el.state.entries[d.entryIndex].needsSync = true;
  Entry.update(d.entryId, d.entry).then(function(){
    slowUpdateSuccess(el, d.entryId);
  }).catch(function(err){
    slowUpdateFailure(el, err);
  });
};

const updateEntry = debounce(slowUpdate, 500);

const slowUpdateSuccess = function(el, id){
  // Remove entry's needsSync property
};

const slowUpdateFailure = function(el, err){
  console.log('slowUpdateFailure', err);
};

const deleteEntry = function(el, e){
  el.setState({loading: el.state.loading + 1});
  // if(isNaN(entryIndex)) return;

  Entry.del(e.detail.id).then(function(){
    deleteEntrySuccess(el, e.detail.id);
  }).catch(err => {
    deleteEntryFailure(el, err);
  });
};

const deleteEntrySuccess = function(el, id){
  var entryIndex = findObjectIndexById(id, el.state.entries);
  persist(el, {
    loading: el.state.loading - 1,
    entries: removeObjectByIndex(entryIndex, el.state.entries)
  }, function(){
    route('/entries');
  });
};

const deleteEntryFailure = function(el, err){
  console.log('deleteEntryFailure', err);
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

const newEntry = function(el){
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

export default { getEntries, createEntry, getEntry, updateEntry, deleteEntry, setEntry, newEntry };
