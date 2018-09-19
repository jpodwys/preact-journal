import cookie from '../cookie';
import { sortObjectsByDate, filterHiddenEntries, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

const persist = (obj, prop, value/*, oldVal*/) => {
  switch(prop) {
    case 'dark':        localStorage.setItem('dark', !!value);      return;
    case 'timestamp':   localStorage.setItem('timestamp', value);   return;
    case 'entries': {
      obj.entries = sortObjectsByDate(value);
      localStorage.setItem('entries', JSON.stringify(obj.entries));
      return;
    }
  }
};

const compute = (obj, prop, value/*, oldVal*/) => {
  switch(prop) {
    case 'entries': // Fallthrough
    case 'filterText': {
      // If the new query is a continuation of the prior query,
      // fitler viewEntries for efficiency.
      // let entries = 'entries';
      // if(prop === 'filterText') {
      //   const q = value.toLowerCase();
      //   if(q.length > oldVal.length && q.indexOf(oldVal) === 0) entries = 'viewEntries';
      // }
      // obj.viewEntries = applyFilters(obj.filterText, obj[entries]);
      obj.viewEntries = applyFilters(obj.filterText, obj.entries);
      return;
    }
  }
};

const handler = {
  set: function(obj, prop, value) {
    // let oldVal = obj[prop];
    obj[prop] = value;
    persist(obj, prop, value/*, oldVal*/);
    compute(obj, prop, value/*, oldVal*/);
    return true;
  }
};

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;
  let viewEntries;
  if(entries){
    entries = sortObjectsByDate(entries);
    viewEntries = filterHiddenEntries(entries);
  }
  let timestamp = localStorage.getItem('timestamp') || undefined;

  let state = {
    scrollPosition: 0,
    view: getViewFromHref(location.href),
    showFilterInput: false,
    filterText: '',
    loggedIn: loggedIn,
    timestamp: timestamp,
    entry: undefined,
    entryIndex: -1,
    entries: entries,
    viewEntries: viewEntries || entries,
    toastConfig: undefined,
    dark: localStorage.getItem('dark') === 'true'
  };

  return new Proxy(state, handler);
};
