import { app } from './app-state';
import { loadAccount } from './actions/entry-actions';

// Boot: load the active account's cached entries, then fetch what the server has.
// A deep link to an entry needs nothing more: the entry on screen is an id, and it resolves once the entries are in.
export const loadEntries = () =>
  app.userId
    ? loadAccount(app.userId).catch(() => {})
    : Promise.resolve();
