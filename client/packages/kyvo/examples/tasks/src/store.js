import { store, watch } from '../../../core.js';

const KEY = 'tasks-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };

// All app state in one store. Values are replaced, never mutated.
export const tasks = store({ items: load(), filter: 'all', query: '', selected: null, modal: null });

watch(tasks, (key, items) => { if (key === 'items') localStorage.setItem(KEY, JSON.stringify(items)); });

// Derived data is just a function of the store.
export const visible = () => {
  const q = tasks.query.toLowerCase();
  return tasks.items.filter(t =>
    (tasks.filter === 'all' || (tasks.filter === 'done') === t.done) && t.title.toLowerCase().includes(q));
};
