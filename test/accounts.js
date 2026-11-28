// Test helpers for the persisted 'accounts' key. The store owns accounts now, so seeding means
// writing the stored format and re-reading it, exactly what a page load does.
import { resetState } from '../client/js/app-state';

export const saveAccounts = accounts => {
  localStorage.setItem('accounts', JSON.stringify(accounts));
  resetState();
};
export const getAccounts = () => JSON.parse(localStorage.getItem('accounts') || '[]');
