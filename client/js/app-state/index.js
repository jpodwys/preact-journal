import cookie from '../cookie';
import { sortObjectsByDate, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let _filterText = '';
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;

  const computedProps = {
    viewEntries: {
      computer: applyFilters,
      args: ['filterText', 'entries']
    }
  };

  let state = {
    entries: [],
    entryIndex: -1,
    filterText: '',
    viewEntries: [],
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true'
  };

  let compute = {
    set: function(obj, prop, value) {
      obj[prop] = value;

      for(let computedProp in computedProps){
        let computedConfig = computedProps[computedProp];
        if(~computedConfig.args.indexOf(prop)){
          let computedArgs = computedConfig.args.map(arg => {
            return obj[arg];
          });
          obj[computedProp] = computedConfig.computer(...computedArgs);
        }
      }

      return true;
    }
  };

  let stateProxy = new Proxy(state, compute);

  stateProxy.entries = entries;

  return stateProxy;
};
