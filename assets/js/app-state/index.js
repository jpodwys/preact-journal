import cookie from '../cookie';
import { sortObjectsByDate, filterHiddenEntries, clearLocalStorage } from '../utils';

const getViewFromHref = function(href){
  if(~href.indexOf('/entries')){
    return '/entries';
  } else if(~href.indexOf('/entry/new')){
    return '/new'
  } else if(~href.indexOf('/entry')){
    return '/entry'
  } else {
    return '/';
  }
};

const getInitialState = function() {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;
  if(entries) entries = sortObjectsByDate(entries);
  let viewEntries;
  if(entries) viewEntries = filterHiddenEntries(entries);

  let state = {
    scrollPosition: 0,
    view: getViewFromHref(location.href),
    showFilterInput: false,
    filterText: '',
    entryReady: false,
    loggedIn: loggedIn,
    syncing: 0,
    entryIndex: -1,
    entry: undefined,
    entries: entries,
    viewEntries: viewEntries || entries,
    toastConfig: undefined
  };

  return state;
};

export default getInitialState;
