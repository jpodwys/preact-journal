import { get, set } from 'idb-keyval';
import cookie from '../cookie';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import { fire } from '../../components/unifire';

const compute = (obj, prop, value) => {
  switch(prop) {
    // viewEntries
    case 'filter': // Fallthrough
    case 'entries': // Fallthrough
    case 'filterText': {
      obj.viewEntries = applyFilters(obj.filterText, obj.filter, obj.entries);
    }

    // showFilterInput
    case 'filter': // Fallthrough
    case 'filterText': //Fallthrough
    case 'showFilterInput': {
      if(prop === 'showFilterInput' && !value)
      obj.showFilterInput = (!!obj.filter || !!obj.filterText);
    }
  }
};

const observe = (obj, prop, value) => {
  switch(prop) {
    case 'entries': {
      obj.entries = sortObjectsByDate(value);
      set('entries', obj.entries);
      return;
    }
    case 'timestamp':   localStorage.setItem('timestamp', value);   return;
    case 'dark':        localStorage.setItem('dark', !!value);      return;
    case 'loggedIn':    if(value) setTimeout(fire('getEntries'));   return;
  }
};

const handler = {
  set: function(obj, prop, value) {
    obj[prop] = value;
    compute(obj, prop, value);
    observe(obj, prop, value);
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
    showFilterInput: false,
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true',
    timestamp: localStorage.getItem('timestamp') || undefined
  };

  get('entries').then((entries = []) => {
    fire('boot', { entries })();
  }).catch();

  return new Proxy(state, handler);
};
