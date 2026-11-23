import { app } from '../app-state';
import { getViewFromPathname } from '../utils';
import { route } from '../../components/router';
import { newEntry, setEntry } from './entry-actions';

const set = delta => Object.assign(app, delta);

export function toggleDarkMode () {
  set({ dark: !app.dark, dialogMode: '' });
};

export function handleRouteChange (url) {
  const view = getViewFromPathname(url);
  if(view !== '/' && !app.loggedIn) return route('/', true);
  if(view !== app.view) app.view = view;
  handleRoute(view, url);
};

function handleRoute (view, url) {
  switch(view) {
    case '/':         handleLoginView();    break;
    case '/switch':   break;
    case '/entries':  // Fallthrough
    case '/search':   handleEntriesView();  break;
    case '/entry':    // Fallthrough
    case '/new':      handleEntryView(url); break;
    default:          route('/', true);     break;
  }
};

function handleLoginView () {
  if(app.loggedIn) route('/entries', true);
};

// Leaving a blank, never-written new entry discards it.
function handleEntriesView () {
  const kept = app.entries.filter(e => !(e.newEntry && !e.text));
  if(kept.length < app.entries.length) app.entries = kept;
};

function handleEntryView (url) {
  const id = url.substr(url.lastIndexOf('/') + 1);
  if(id === 'new') newEntry();
  else setEntry({ id });
};
