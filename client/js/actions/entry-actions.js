import Entry from '../services/entry-service';
import { findObjectIndexById, removeObjectByIndex, isActiveEntryId } from '../utils';
import exportAllEntries from '../../js/export-entries';
import debounce from '../debounce';
import { route } from '../../components/router';
import { fire } from '../../components/unifire';

let dataFetched = false;

function boot (el, { entries }){
  el.set({ entries }, () => {
    getEntries(el);
    /**
     * If the user is trying to view a specific entry,
     * I need to rerun the route handler once the
     * entries have been loaded from indexedDB.
     *
     * There may be a better way to manage this.
     * Perhaps I can make entry a computed property
     * that depends on view and entries. But that
     * would be wasteful since I only need to check
     * this on boot.
     *
     * I'll think about it, but for now I'm going to
     * leave this here.
     */
    if(el.state.view === '/entry'){
      fire('handleRouteChange', location.pathname);
    }
  });
};

function getEntries (el){
  if(!el.state.loggedIn) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  if(el.state.timestamp){
    syncEntries(el, el.state.timestamp);
  } else {
    getAllEntries(el);
  }
};

function getAllEntries (el){
  Entry.getAll()
    .then(response => getAllEntriesSuccess(el, response))
    .catch(err => getAllEntriesError(el, err));
};

function getAllEntriesSuccess (el, { timestamp, entries }){
  el.set({
    timestamp,
    entries: [].concat(el.state.entries, entries)
  });
};

function getAllEntriesError (el, err){
  console.log('getAllEntriesError', err)
};

// Send updates to the server
function syncClientEntries (el){
  var entries = el.state.entries;
  if(!entries.length) return;
  entries.forEach(entry => {
    if(entry.needsSync){
      var func;

      if(entry.newEntry)      func = createEntry;
      else if(entry.deleted)  func = deleteEntry;
      else                    func = putEntry;

      func(el, { id: entry.id, entry: entry, clientSync: true });
    }
  });
};

// Get updates from the server
function syncEntries (el){
  Entry.sync(el.state.timestamp)
    .then(response => syncEntriesSuccess(el, response))
    .catch(err => syncEntriesFailure(el, err));
  syncClientEntries(el);
};

function syncEntriesSuccess (el, { entries, timestamp }){
  if(entries.length === 0){
    localStorage.setItem('timestamp', timestamp);
    return;
  }

  applySyncPatch(el, entries);
  persistSyncPatch(el, timestamp);
};

function applySyncPatch (el, entries){
  entries.forEach((entry) => {
    var entryIndex = findObjectIndexById(entry.id, el.state.entries);
    if(entryIndex > -1){
      if(entry.deleted) el.state.entries = removeObjectByIndex(entryIndex, el.state.entries);
      else el.state.entries[entryIndex] = entry;
    } else {
      entry.slideIn = true;
      el.state.entries.unshift(entry);
    }
  });
};

function persistSyncPatch (el, timestamp){
  el.set({
    timestamp,
    entries: [].concat(el.state.entries)
  }, () => {
    if(el.state.view === '/entry' && el.state.entryId){
      setEntry(el, {id: el.state.entryId});
    }
  });
};

function syncEntriesFailure (el, err){
  console.log('syncEntriesFailure', err)
};

function createEntry (el, { entry, clientSync }){
  if(!entry || typeof entry.id !== 'number') return;
  /**
   * When a user navigates to the new entry page,
   * I automatically unshift a blank entry onto
   * the entries array. I had good reasons for
   * doing this that I don't want to explain here.
   * Regardless, when we create an entry, we are
   * really just updating the existing empty entry
   * then POSTing it to the back end.
   */
  var entryIndex = findObjectIndexById(entry.id, el.state.entries);
  if(entryIndex === -1) return;

  const postPending = entry.postPending;
  entry.postPending = true;
  el.state.entries[entryIndex] = entry;

  el.set({
    entry,
    entries: [].concat(el.state.entries)
  });

  /**
   * clientSync overrides postPending here to account
   * for the edge case where postPending is set and
   * the user closes the app before the POST call
   * returns. In the event that the original POST
   * succeeded, this results in duplicate entries.
   * In the event that the original POST failed for
   * whatever reason, results in the behavior you
   * would expect.
   *
   * My original thought was to allow the client
   * to generate the ID that ends up getting used in
   * the database as the entry's id. I settled on
   * this plan to avoid entry id collisions.
   *
   * I would like to revisit this at some point. It
   * makes sense that if an entry has the newEntry,
   * needsSync, and postPending flags all set to true,
   * then the front end would call an endpoint to
   * upsert than POST.
   *
   * For now, however, this is why clientSync
   * overrides postPending.
   */
  if(!clientSync && postPending) return;

  Entry.create({ date: entry.date, text: entry.text })
    .then(response => createEntrySuccess(el, entry.id, response.id))
    .catch(err => createEntryFailure(el, entry.id, err));
};

function createEntrySuccess (el, oldId, id){
  var entryIndex = findObjectIndexById(oldId, el.state.entries);

  /**
   * Only update state.entry if the entry we just
   * modified is still active.
   */
  if(isActiveEntryId(el, oldId)) el.state.entry.id = id;

  el.state.entries[entryIndex].id = id;
  delete el.state.entries[entryIndex].postPending;
  delete el.state.entries[entryIndex].newEntry;
  /**
   * Because needsSync is a boolean, removing it here
   * can introduce a problem.
   *
   * For example, if I type one character and pause,
   * thereby triggering a POST, that will add the
   * needsSync and postPending flags to the entry. As
   * a result, anything I type while the POST is
   * pending (which would normally trigger adding the
   * needsSync flag to the entry) will be ignored when
   * the POST returns and triggers a removal of the
   * entry's needsSync flag.
   *
   * A potential solution could be to make needsSync
   * an integer so I can increment it when it needs
   * both a POST and a PATCH.
   */
  delete el.state.entries[entryIndex].needsSync;

  el.set({
    entry: Object.assign({}, el.state.entry),
    entries: [].concat(el.state.entries)
  });
};

function createEntryFailure (el, oldId, err){
  /**
   * Only update state.entry if the entry we just
   * modified is still active.
   */
  if(isActiveEntryId(el, oldId)) delete el.state.entry.postPending;

  var entryIndex = findObjectIndexById(oldId, el.state.entries);
  delete el.state.entries[entryIndex].postPending;
  el.set({
    entry: Object.assign({}, el.state.entry),
    entries: [].concat(el.state.entries)
  });
  console.log('createEntryFailure', err);
};

function toggleFavorite (el, { id, favorited }){
  updateEntry(el, {
    entry: { favorited },
    property: 'favorited',
    entryId: id
  });
};

function updateEntry (el, { entry, property, entryId }){
  if(!entry || !property || typeof entryId !== 'number') return;
  var entryIndex = findObjectIndexById(entryId, el.state.entries);
  if(entryIndex === -1) return;
  var activeEntry = el.state.entries[entryIndex];
  var current = activeEntry[property];
  var next = entry[property];
  if(current === next) return;

  activeEntry[property] = entry[property];
  activeEntry.needsSync = true;
  el.set({
    entry: Object.assign({}, activeEntry),
    entries: [].concat(el.state.entries)
  });

  Entry.update(entryId, entry)
    .then(() => updateEntrySuccess(el, entryId))
    .catch(err => updateEntryFailure(el, err));
};

function updateEntrySuccess (el, id){
  const entries = [].concat(el.state.entries);
  const entryIndex = findObjectIndexById(id, entries);
  delete entries[entryIndex].needsSync;

  /**
   * Only update state.entry if the entry we just
   * modified is still active.
   */
  const entry = isActiveEntryId(el, id)
    ? Object.assign({}, entries[entryIndex])
    : el.state.entry;

  el.set({ entry, entries });
};

function updateEntryFailure (el, err){
  console.log('updateEntryFailure', err);
};

function putEntry (el, { entry }){
  Entry.update(entry.id, entry)
    .then(() => updateEntrySuccess(el, entry.id))
    .catch(err => updateEntryFailure(el, err));
};

function showConfirmDeleteEntryModal (el, { entry }){
  el.set({
    entry,
    dialogMode: 'modal:delete'
  });
};

function deleteEntry (el, { id }){
  if(typeof id !== 'number') return;

  var entryIndex = findObjectIndexById(id, el.state.entries);
  if(entryIndex === -1) return;

  el.state.entries[entryIndex].needsSync = true;
  el.state.entries[entryIndex].deleted = true;
  el.state.entries[entryIndex].text = '';

  el.set({
    entry: undefined,
    entries: [].concat(el.state.entries),
    dialogMode: ''
  }, () => {
    if(el.state.view !== '/entries') route('/entries', true);
  });

  Entry.del(id)
    .then(() => deleteEntrySuccess(el, id))
    .catch(err => deleteEntryFailure(el, err));
};

function deleteEntrySuccess (el, id){
  var entryIndex = findObjectIndexById(id, el.state.entries);
  el.set({
    entries: removeObjectByIndex(entryIndex, el.state.entries)
  });
};

function deleteEntryFailure (el, err){
  console.log('deleteEntryFailure', err);
};

function setEntry (el, { id }){
  if(!id || id === -1 || !el.state.entries.length) return;

  // If writing a new entry, look in state.entries,
  // otherwise look in state.viewEntries.
  // This is only necessary because I unshift
  // new blank entries onto state.entries.
  var collection = el.state.view === '/new'
    ? 'entries'
    : 'viewEntries';

  var entryIndex = findObjectIndexById(parseInt(id), el.state[collection]);
  var entry = el.state[collection][entryIndex];

  el.set({ entry, entryIndex });
};

function newEntry (el){
  var entry = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    text: '',
    needsSync: true,
    newEntry: true,
    slideIn: true
  };

  el.set({
    entry,
    entries: [entry].concat(el.state.entries)
  }, function(){
    setEntry(el, { id: entry.id });
  });
};

function filterByText (el, query = ''){
  if(el.state.filterText === query) return;
  el.set({ filterText: query });
};

function toggleSort (el){
  const sort = el.state.sort;
  el.set({
    sort: sort === 'desc' ? 'asc' : 'desc',
    dialogMode: ''
  });
};

function shiftEntry (el, count){
  if(el.state.view !== '/entry' || !count || !el.state.entry) return;
  var entryIndex = findObjectIndexById(parseInt(el.state.entry.id), el.state.viewEntries);
  let entry = el.state.viewEntries[entryIndex + count];
  if(entry) route('/entry/' + entry.id, true, count === 1 ? false : true);
};

function clearFilters (el) {
  el.set({
    filter: '',
    filterText: ''
  });
};

function removeSlideInProp (el) {
  const entries = el.state.entries.map(entry => {
    delete entry.slideIn;
    return entry;
  });

  el.set({ entries });
};

function exportEntries (el) {
  exportAllEntries(el.state.viewEntries);
};

export default {
  boot,
  getEntries,
  createEntry,
  updateEntry,
  showConfirmDeleteEntryModal,
  deleteEntry,
  setEntry,
  newEntry,
  filterByText,
  shiftEntry,
  toggleFavorite,
  clearFilters,
  removeSlideInProp: debounce(removeSlideInProp, 50),
  exportEntries,
  toggleSort
};
