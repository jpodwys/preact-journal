import { get, set } from 'idb-keyval';
import cookie from '../cookie';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import fire from '../fire';

const persist = (obj, prop, value/*, oldVal*/) => {
  switch(prop) {
    case 'dark':        localStorage.setItem('dark', !!value);      return;
    case 'timestamp':   localStorage.setItem('timestamp', value);   return;
    case 'entries': {
      obj.entries = sortObjectsByDate(value);
      set('entries', obj.entries);
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
  if(!loggedIn) clearData();

  let state = {
    entries: [],
    viewEntries: [],
    scrollPosition: 0,
    showFilterInput: false,
    filterText: '',
    loggedIn: loggedIn,
    entry: undefined,
    entryIndex: -1,
    toastConfig: undefined,
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true',
    timestamp: localStorage.getItem('timestamp') || undefined
  };

  get('entries').then((entries = []) => {
    fire('boot', { entries })();
  }).catch();

  return new Proxy(state, handler);
};
