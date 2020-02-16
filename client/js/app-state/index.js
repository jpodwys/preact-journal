import { get, set } from 'idb-keyval';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import { fire } from '../../components/unifire';

const compute = (obj, prop) => {
  switch(prop) {
    // viewEntries
    case 'view': // Fallthrough
    case 'sort': // Fallthrough
    case 'filter': // Fallthrough
    case 'entries': // Fallthrough
    case 'filterText': {
      obj.viewEntries = applyFilters(obj.view, obj.filterText, obj.filter, obj.sort, obj.entries);
    }
  }
};

const observe = (obj, prop, next, prev) => {
  switch(prop) {
    case 'view': {
      // obj.entry = undefined;
      obj.dialogMode = '';
      if(prev === '/search' && next === '/entries'){
        fire('clearFilters');
      }
      return;
    }
    case 'entries': {
      obj.entries = sortObjectsByDate(next);
      set('entries', obj.entries);
      return;
    }
    case 'dark':        {
      localStorage.setItem('dark', !!next);
      const func = next ? 'add' : 'remove';
      document.body.classList[func]('dark');
      return;
    }
  }
};

const handler = {
  set: function(obj, prop, next) {
    const prev = obj[prop];
    obj[prop] = next;
    compute(obj, prop);
    observe(obj, prop, next, prev);
    return true;
  }
};

export default function getInitialState () {
  let state = {
    entries: [],
    viewEntries: [],
    scrollPosition: 0,
    sort: 'desc',
    filter: '',
    filterText: '',
    entryIndex: -1,
    entry: undefined,
    // Included for documentation purporses
    // toast: '',
    // dialogMode: '',
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true'
  };

  get('entries').then((entries = []) => {
    fire('boot', { entries });
  }).catch();

  // Now that I'm setting a class to body, I
  // have to ensure it gets set on load.
  observe(null, 'dark', state.dark);

  return new Proxy(state, handler);
};
