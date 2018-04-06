import Entry from '../services/entry-service';
import { findObjectIndexById, removeObjectByIndex, applyFilters } from '../utils';
import persist from '../persist';

let dataFetched = false;

const getEntries = function(el){
  if(!el.state.loggedIn) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  let timestamp = localStorage.getItem('timestamp');
  if(timestamp){
    syncEntries(el, timestamp);
  } else {
    getAllEntries(el);
  }
};

const getAllEntries = function(el){
  if(el.state.entries) return;
  Entry.getAll().then(response => {
    getAllEntriesSuccess(el, response);
  }).catch(err => {
    getAllEntriesError(el, err);
  });
};

const getAllEntriesSuccess = function(el, response){
  persist(el, {
    entries: response.entries,
  }, function(){
    // setEntry(el, {detail: {id: el.state.entryId/*, entryReady: true*/}});
    localStorage.setItem('timestamp', response.timestamp);
  });
};

const getAllEntriesError = function(el, err){
  console.log('getAllEntriesError', err)
};

// Send updates to the server
const syncClientEntries = function(el){
  var entries = el.state.entries;
  entries.forEach(entry => {
    if(entry.needsSync){
      var func;

      if(entry.newEntry)      func = createEntry;
      else if(entry.deleted)  func = deleteEntry;
      else                    func = putEntry;

      func(el, {id: entry.id, entry: entry, clientSync: true});
    }
  });
};

// Get updates from the server
const syncEntries = function(el, timestamp){
  Entry.sync(timestamp).then(response => {
    syncEntriesSuccess(el, response);
  }).catch(err => {
    syncEntriesFailure(el, err);
  });
  syncClientEntries(el);
};

const syncEntriesSuccess = function(el, response){
  if(response.entries.length === 0){
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
    entries: [].concat(el.state.entries)
  }, function(){
    if(el.state.view === '/entry' && el.state.entryId){
      setEntry(el, {id: el.state.entryId/*, entryReady: true*/});
    }
    localStorage.setItem('timestamp', timestamp);
  });
};

const syncEntriesFailure = function(el, err){
  console.log('syncEntriesFailure', err)
};

const createEntry = function(el, { entry, clientSync }){
  var entryIndex = findObjectIndexById(entry.id, el.state.entries);
  el.state.entries[entryIndex] = entry;

  persist(el, {
    entry: entry,
    entries: [].concat(el.state.entries)
  });

  if(!clientSync && entry.postPending) return;

  el.state.entries[entryIndex].postPending = true;
  persist(el, {
    entries: [].concat(el.state.entries)
  });

  Entry.create(entry).then(response => {
    createEntrySuccess(el, entry.id, response);
  }).catch(err => {
    createEntryFailure(el, entry.id, err);
  });
};

const createEntrySuccess = function(el, oldId, response){
  var entryIndex = findObjectIndexById(oldId, el.state.entries);

  if(el.state.entry.id === oldId){
    el.state.entry.id = response.id;
  }
  el.state.entries[entryIndex].id = response.id;
  delete el.state.entries[entryIndex].postPending;
  delete el.state.entries[entryIndex].newEntry;
  delete el.state.entries[entryIndex].needsSync;

  persist(el, {
    entry: Object.assign({}, el.state.entry),
    entries: [].concat(el.state.entries)
  });
};

const createEntryFailure = function(el, oldId, err){
  var entryIndex = findObjectIndexById(oldId, el.state.entries);
  delete el.state.entries[entryIndex].postPending;
  el.setState({
    entries: [].concat(el.state.entries)
  });
  console.log('createEntryFailure', err);
};

const updateEntry = function(el, { entry, property, entryId }){
  var val = entry[property];
  if(typeof val === 'string'){
    val = val.trim();
  }

  entry[property] = entry[property];
  var entryIndex = findObjectIndexById(entryId, el.state.entries);
  var current = el.state.entries[entryIndex][property];
  var next = entry[property];
  if(current === next) return;

  el.state.entries[entryIndex][property] = entry[property];
  el.state.entries[entryIndex].needsSync = true;
  persist(el, {
    entry: Object.assign({}, el.state.entries[entryIndex]),
    entries: [].concat(el.state.entries)
  });

  Entry.update(entryId, entry).then(function(){
    updateEntrySuccess(el, entryId);
  }).catch(function(err){
    updateEntryFailure(el, err);
  });
};

const updateEntrySuccess = function(el, id){
  let entries = [].concat(el.state.entries);
  var entryIndex = findObjectIndexById(id, entries);
  delete entries[entryIndex].needsSync;
  persist(el, {
    entry: Object.assign({}, entries[entryIndex]),
    entries: entries
  });
};

const updateEntryFailure = function(el, err){
  console.log('updateEntryFailure', err);
};

const putEntry = function(el, { entry }){
  Entry.update(entry.id, entry).then(function(){
    updateEntrySuccess(el, entry.id);
  }).catch(function(err){
    updateEntryFailure(el, err);
  });
};

const deleteEntry = function(el, { id }){
  if(!id) return;

  var entryIndex = findObjectIndexById(id, el.state.entries);
  el.state.entries[entryIndex].needsSync = true;
  el.state.entries[entryIndex].deleted = true;

  persist(el, {
    entry: undefined,
    entries: [].concat(el.state.entries)
  }, function(){
    if(el.state.view !== '/entries') route('/entries', true);
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
    entries: removeObjectByIndex(entryIndex, el.state.entries)
  });
};

const deleteEntryFailure = function(el, err){
  console.log('deleteEntryFailure', err);
};

const setEntry = function(el, { id/*, entryReady*/ }){
  if(!id || id === -1) return;

  var entryIndex = findObjectIndexById(parseInt(id), el.state.entries);
  var entry = el.state.entries[entryIndex];
  // var entryReady = !!entry || !!entryReady;

  el.setState({
    entry: entry,
    // entryReady: entryReady
  });
};

const newEntry = function(el){
  var entry = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    text: '',
    needsSync: true,
    newEntry: true
  };

  el.setState({
    entry: entry,
    entries: [entry].concat(el.state.entries)
  }, function(){
    setEntry(el, {id: entry.id/*, entryReady: true*/});
  });
};

const filterByText = function(el, text, e){
  if(text === undefined && (!e || !e.target)) return;
  let value = text === undefined ? e.target.value : text;
  if(el.state.filterText === value) return;
  if(!value) return el.setState({
    filterText: '',
    viewEntries: applyFilters('', el.state.entries)
  });

  // If the new query is a continuation of the prior query,
  // fitler viewEntries for efficiency.
  var query = value;
  var q = query.toLowerCase();
  var entries = (q.indexOf(el.state.filterText) === 0)
    ? el.state.viewEntries
    : el.state.entries;

  var viewEntries = applyFilters(q, entries);
  el.setState({
    filterText: query,
    viewEntries: viewEntries
  });
};

const blurTextFilter = function(el){
  if(!el.state.filterText){
    el.setState({showFilterInput: false});
  }
};

const shiftEntry = function(el, count){
  if(el.state.view !== '/entry' || !count || !el.state.entries || !el.state.entry) return;
  var entryIndex = findObjectIndexById(parseInt(el.state.entry.id), el.state.viewEntries);
  let entry = el.state.viewEntries[entryIndex + count];
  if(entry) route('/entry/' + entry.id);
};

export default {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  setEntry,
  newEntry,
  filterByText,
  blurTextFilter,
  shiftEntry
};
