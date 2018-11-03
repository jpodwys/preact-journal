import { get, set } from 'idb-keyval';
import cookie from '../cookie';
import { sortObjectsByDate, getViewFromHref, applyFilters, clearData } from '../utils';
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

export default function getInitialState (el) {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearData();
  let view = getViewFromHref(location.pathname);

  let state = {
    loading: true,
    scrollPosition: 0,
    view,
    showFilterInput: false,
    filterText: '',
    loggedIn: loggedIn,
    entry: undefined,
    entryIndex: -1,
    toastConfig: undefined,
    dark: localStorage.getItem('dark') === 'true',
    timestamp: localStorage.getItem('timestamp') || undefined
  };

  const proxy = new Proxy(state, handler);

  get('entries').then(entries => {
    setTimeout(() => {
      el.set({ entries }, () => {
        if(entries && el.state.timestamp){
          fire('syncEntries')();
        }
        if(el.state.view === '/entry'){
          fire('executeRoute')();
        }
      })
    }, 1000);
  }).catch();

  return proxy;
};
