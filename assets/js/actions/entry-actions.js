import Entry from '../services/entry-service';
import { route } from 'preact-router';
import debounce from '../debounce';
import { findObjectIndexById, removeObjectByIndex, filterObjectsByText } from '../utils';
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

// Sync entries to the server that were updated while offline
const syncClientEntries = function(el){
  var entries = el.state.entries;
  entries.forEach(entry => {
    if(entry.needsSync){
      var func;

      if(entry.newEntry)      func = slowCreate;
      else if(entry.deleted)  func = deleteEntry;
      else                    func = putEntry;

      func(el, {detail: {id: entry.id, entry: entry, clientSync: true}});
    }
  });
};

// Sync entries with newer versions from the server
const syncEntries = function(el, e){
  el.setState({loading: el.state.loading + 1});
  Entry.sync(e.detail.timestamp).then(response => {
    syncEntriesSuccess(el, response);
  }).catch(err => {
    syncEntriesFailure(el, err);
  });
  syncClientEntries(el);
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

  var entryIndex = findObjectIndexById(entry.id, el.state.entries);
  el.state.entries[entryIndex] = entry;

  persist(el, {
    loading: el.state.loading + 1,
    entry: entry,
    entries: [].concat(el.state.entries)
  });

  if(!e.detail.clientSync && entry.postPending) return;

  el.state.entries[entryIndex].postPending = true;
  persist(el, {
    entries: [].concat(el.state.entries)
  });

  Entry.create(entry).then(response => {
    slowCreateSuccess(el, entry.id, response);
  }).catch(err => {
    slowCreateFailure(el, entry.id, err);
  });
};

const createEntry = debounce(slowCreate, 500);

const slowCreateSuccess = function(el, oldId, response){
  var entryIndex = findObjectIndexById(oldId, el.state.entries);

  if(el.state.entry.id === oldId){
    el.state.entry.id = response.id;
  }
  el.state.entries[entryIndex].id = response.id;
  delete el.state.entries[entryIndex].postPending;
  delete el.state.entries[entryIndex].newEntry;
  delete el.state.entries[entryIndex].needsSync;

  persist(el, {
    loading: el.state.loading - 1,
    entry: Object.assign({}, el.state.entry),
    entries: [].concat(el.state.entries)
  });
};

const slowCreateFailure = function(el, err){
  var entryIndex = findObjectIndexById(oldId, el.state.entries);
  delete el.state.entries[entryIndex].postPending;
  el.setState({
    loading: el.state.loading - 1,
    entries: [].concat(el.state.entries)
  });
  console.log('slowCreateFailure', err);
};

const slowUpdate = function(el, e){
  var d = e.detail;
  var val = d.entry[d.property];
  if(typeof val === 'string'){
    val = val.trim();
  }

  d.entry[d.property] = d.entry[d.property];
  var entryIndex = findObjectIndexById(d.entryId, el.state.entries);
  var current = el.state.entries[entryIndex][d.property];
  var next = d.entry[d.property];
  if(current === next) return;

  el.state.entries[entryIndex][d.property] = d.entry[d.property];
  el.state.entries[entryIndex].needsSync = true;
  persist(el, {
    entry: Object.assign({}, el.state.entries[entryIndex]),
    entries: [].concat(el.state.entries)
  });

  Entry.update(d.entryId, d.entry).then(function(){
    slowUpdateSuccess(el, d.entryId);
  }).catch(function(err){
    slowUpdateFailure(el, err);
  });
};

const updateEntry = debounce(slowUpdate, 500);

const slowUpdateSuccess = function(el, id){
  let entries = [].concat(el.state.entries);
  var entryIndex = findObjectIndexById(id, entries);
  delete entries[entryIndex].needsSync;
  persist(el, {
    entry: Object.assign({}, entries[entryIndex]),
    entries: entries
  });
};

const slowUpdateFailure = function(el, err){
  console.log('slowUpdateFailure', err);
};

const putEntry = function(el, e){
  var entry = e.detail.entry;
  Entry.update(entry.id, entry).then(function(){
    slowUpdateSuccess(el, entry.id);
  }).catch(function(err){
    slowUpdateFailure(el, err);
  });
};

const deleteEntry = function(el, e){
  // if(isNaN(entryIndex)) return;
  // el.setState({loading: el.state.loading + 1});

  var id = e.detail.id;
  if(!id) return;

  var entryIndex = findObjectIndexById(id, el.state.entries);
  el.state.entries[entryIndex].needsSync = true;
  el.state.entries[entryIndex].deleted = true;

  persist(el, {
    entry: undefined,
    entries: [].concat(el.state.entries)
  }, function(){
    route('/entries');
  });

  Entry.del(id).then(function(){
    deleteEntrySuccess(el, id);
  }).catch(err => {
    deleteEntryFailure(el, err);
  });
};

const deleteEntrySuccess = function(el, id){
  var entryIndex = findObjectIndexById(id, el.state.entries);
  persist(el, {
    // loading: el.state.loading - 1,
    entries: removeObjectByIndex(entryIndex, el.state.entries)
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

const slowFilter = function(el, e){
  if(!e || !e.detail) return;
  if(!e.detail.value) return el.setState({
    filterText: '',
    viewEntries: el.state.entries
  });

  // If the new query is a continuation of the prior query,
  // fitler viewEntries for efficiency.
  var query = e.detail.value.toLowerCase();
  var entries = (query.indexOf(el.state.filterText) === 0)
    ? el.state.viewEntries
    : el.state.entries;

  var viewEntries = filterObjectsByText(query, entries);
  el.setState({
    filterText: query,
    viewEntries: viewEntries
  });
};

const filterByText = debounce(slowFilter, 200);

const blurTextFilter = function(el){
  if(!el.state.filterText){
    el.setState({showFilterInput: false});
  }
};

export default {
  getEntries,
  createEntry,
  getEntry,
  updateEntry,
  deleteEntry,
  setEntry,
  newEntry,
  filterByText,
  blurTextFilter
};
