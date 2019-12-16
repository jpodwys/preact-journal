import { findObjectIndexById, removeObjectByIndex } from '../utils';
import exportAllEntries from '../../js/export-entries';
import debounce from '../debounce';
import { route } from '../../components/router';
import { fire } from '../../components/unifire';

function boot (el, { entries }){
  el.set({ entries }, () => {
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

function createEntry (el, { entry, clientSync }){
  if(!entry || typeof entry.id !== 'number') return;
  /**
   * When a user navigates to the new entry page,
   * I automatically unshift a blank entry onto
   * the entries array. I had good reasons for
   * doing this that I don't want to explain here.
   * Regardless, when we create an entry, we are
   * really just updating the existing empty entry.
   */
  var entryIndex = findObjectIndexById(entry.id, el.state.entries);
  if(entryIndex === -1) return;

  el.state.entries[entryIndex] = entry;
  el.set({
    entry,
    entries: [].concat(el.state.entries)
  });
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
  el.set({
    entry: Object.assign({}, activeEntry),
    entries: [].concat(el.state.entries)
  });
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

  el.set({
    dialogMode: '',
    entry: undefined,
    entries: removeObjectByIndex(entryIndex, el.state.entries)
  });
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
  if(entry) route('/entry/' + entry.id, true);
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
