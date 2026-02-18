import { get, set } from 'idb-keyval';
import { sortObjectsByDate, getViewFromPathname, applyFilters, clearData } from '../utils';
import { fire } from '../../components/unifire';

const filteredViews = ['view', 'sort', 'filter', 'entries', 'filterText'];

const compute = (obj, prop) => {
  if (filteredViews.includes(prop)) {
    obj.viewEntries = applyFilters(obj.view, obj.filterText, obj.filter, obj.sort, obj.entries);
  }
};

const observe = (obj, prop, next, prev) => {
  switch(prop) {
    case 'view': {
      obj.dialogMode = '';
      if(prev === '/search' && next === '/entries'){
        fire('clearFilters');
      }
      break;
    }
    case 'entries': {
      obj.entries = sortObjectsByDate(next);
      set('entries_' + obj.userId, obj.entries);
      break;
    }
    case 'dark': {
      localStorage.setItem('dark', !!next);
      document.body.classList.toggle('dark', !!next);
      break;
    }
    case 'timestamp': localStorage.setItem('timestamp_' + obj.userId, next); break;
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

function getAccounts () {
  try {
    return JSON.parse(localStorage.getItem('accounts')) || [];
  } catch(e) {
    return [];
  }
}

export default function getInitialState () {
  let accounts = getAccounts();
  let active = accounts.find(a => a.active);
  let loggedIn = !!active;
  let userId = active ? String(active.id) : '';
  let username = active ? active.username : '';

  if(!loggedIn && accounts.length === 0) clearData();

  let state = {
    loggedIn,
    userId,
    username,
    entries: [],
    viewEntries: [],
    scrollPosition: 0,
    sort: 'desc',
    filter: '',
    filterText: '',
    entryIndex: -1,
    entry: undefined,
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true',
    timestamp: userId ? localStorage.getItem('timestamp_' + userId) || undefined : undefined
  };

  if(loggedIn) {
    get('entries_' + userId).then((entries = []) => {
      fire('boot', { entries });
    }).catch();
  }

  // Now that I'm setting a class to body, I
  // have to ensure it gets set on load.
  observe(null, 'dark', state.dark);

  return new Proxy(state, handler);
};
