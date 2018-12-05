import { get, set } from 'idb-keyval';
import cookie from '../cookie';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import { fire } from '../../components/unifire';

const persist = (obj, prop, value) => {
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

const compute = (obj, prop, value) => {
  switch(prop) {
    case 'entries': // Fallthrough
    case 'filterText': {
      obj.viewEntries = applyFilters(obj.filterText, obj.entries);
      return;
    }
  }
};

const observe = (obj, prop, value) => {
  switch(prop) {
    case 'loggedIn':  fire('getEntries')();   return;
  }
};

const handler = {
  set: function(obj, prop, value) {
    obj[prop] = value;
    persist(obj, prop, value);
    compute(obj, prop, value);
    observe(obj, prop, value);
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
