import { get } from 'idb-keyval';
import { app } from './app-state';
import { boot } from './actions/entry-actions';

// Reads the active user's cached entries from IndexedDB, then boots the action layer.
export const loadEntries = () =>
  app.loggedIn
    ? get('entries_' + app.userId).then((entries = []) => boot({ entries })).catch(() => {})
    : Promise.resolve();
