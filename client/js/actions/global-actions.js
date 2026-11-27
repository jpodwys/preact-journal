import { app, set } from '../app-state';
import { getViewFromPathname } from '../utils';
import { route } from '../route';
import { newEntry } from './entry-actions';
import { isSending } from '../sync';
import { isNew } from '../sync/record';


export function toggleDarkMode () {
  set({ dark: !app.dark, dialogMode: '' });
};

export function handleRouteChange (url) {
  const view = getViewFromPathname(url);
  if(view !== '/' && !app.userId) return route('/', true);
  if(view !== app.view) app.view = view;
  handleRoute(view, url);
};

function handleRoute (view, url) {
  switch(view) {
    case '/':         if(app.userId) route('/entries', true); break;
    case '/switch':   break;
    case '/entries':  // Fallthrough
    case '/search':   handleEntriesView();  break;
    case '/entry':    // Fallthrough
    case '/new':      { const id = url.substr(url.lastIndexOf('/') + 1); if(id === 'new') newEntry(); else app.entryId = parseInt(id); } break;
    default:          route('/', true);     break;
  }
};

// Leaving a blank, never-written new entry discards it. One whose create is still out is kept: the server is getting it.
function handleEntriesView () {
  const kept = app.entries.filter(e => !(isNew(e) && !e.text && !isSending(e.id)));
  if(kept.length < app.entries.length) app.entries = kept;
};


