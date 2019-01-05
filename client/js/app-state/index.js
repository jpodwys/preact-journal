import { get, set } from 'idb-keyval';
import cookie from '../cookie';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import { fire } from '../../components/unifire';

const compute = (obj, prop, next, prev) => {
  switch(prop) {
    // viewEntries
    case 'filter': // Fallthrough
    case 'entries': // Fallthrough
    case 'filterText': // Fallthrough
    case 'showFilterInput': {
      obj.viewEntries = applyFilters(obj.filterText, obj.filter, obj.showFilterInput, obj.entries);
      return;
    }

    // entry
    // filter
    // filterText
    // dialogMode
    // showFilterInput
    case 'view': {
      obj.entry = undefined;
      obj.dialogMode = '';
      obj.prevView = prev;
      if(prev === '/entries' && next === '/entries' || !obj.filter && !obj.filterText){
        return fire('clearFilters', true)();
      }
    }
  }
};

const observe = (obj, prop, next, prev) => {
  switch(prop) {
    case 'entries': {
      obj.entries = sortObjectsByDate(next);
      set('entries', obj.entries);
      return;
    }
    case 'timestamp':   localStorage.setItem('timestamp', next);   return;
    case 'dark':        localStorage.setItem('dark', !!next);      return;
    case 'loggedIn':    if(next) setTimeout(fire('getEntries'));   return;
  }
};

const handler = {
  set: function(obj, prop, next) {
    const prev = obj[prop];
    obj[prop] = next;
    // obj.prevView = obj.view;
    compute(obj, prop, next, prev);
    observe(obj, prop, next, prev);
    return true;
  }
};

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearData();

  let state = {
    loggedIn,
    entries: [],
    viewEntries: [],
    scrollPosition: 0,
    filter: '',
    filterText: '',
    entryIndex: -1,
    entry: undefined,
    // Included for documentation purporses
    // toastConfig: undefined,
    // dialogMode: '',
    showFilterInput: false,
    view: getViewFromPathname(location.pathname),
    prevView: '',
    dark: localStorage.getItem('dark') === 'true',
    timestamp: localStorage.getItem('timestamp') || undefined
  };

  get('entries').then((entries = []) => {
    fire('boot', { entries })();
  }).catch();

  return new Proxy(state, handler);
};
