import { fire } from '../../components/unifire';
import { removeObjectByIndex, getViewFromPathname } from '../utils';
import { route } from '../../components/router';

let timeout;

function linkstate (el, { key, val, cb }) {
  let obj = {};
  obj[key] = val;
  el.set(obj, cb);
};

function toggleDarkMode (el) {
  el.set({
    dark: !el.state.dark,
    dialogMode: ''
  });
};

// Copied to clipboard confirmation is currently the only toast message.
function setToast (el) {
  if(timeout) clearTimeout(timeout);
  el.set({ toast: 'Entry copied to clipboard!' });
  timeout = setTimeout(() => {
    el.set({ toast: '' });
  }, 2000)
};

function handleRouteChange (el, e, url) {
  url = url || e.url;
  let view = getViewFromPathname(url);
  if(view !== '/' && !el.state.loggedIn) return route('/', true);
  el.set({ view });
  handleRoute(el, view, url);
};

function handleRoute (el, view, url) {
  switch(view) {
    case '/':         handleLoginView(el);    break;
    case '/entries':  handleEntriesView(el);  break;
    case '/entry':    // Fallthrough
    case '/new':      handleEntryView(url);   break;
    default:          route('/');             break;
  }
};

function handleLoginView (el) {
  if(el.state.loggedIn) route('/entries', true);
};

function handleEntriesView (el) {
  if(Array.isArray(el.state.entries)){
    const entry = el.state.entries[0];
    if(entry && entry.newEntry && !entry.text){
      el.set({
        entries: removeObjectByIndex(0, el.state.entries)
      });
    }
  }
};

function handleEntryView (url) {
  const id = url.substr(url.lastIndexOf('/') + 1);
  if(id === 'new'){
    fire('newEntry')();
  } else {
    fire('setEntry', { id })();
  }
};


export default {
  linkstate,
  toggleDarkMode,
  setToast,
  handleRouteChange
};
