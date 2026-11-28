import { tasks } from './store.js';

let seq = 0;
const set = items => { tasks.items = items; };
const patch = (id, fields) => set(tasks.items.map(t => (t.id === id ? { ...t, ...fields } : t)));

export const addTask = title => set([...tasks.items, { id: Date.now() * 1000 + (seq++ % 1000), title, done: false, secs: 1500 }]);
export const toggleTask = id => patch(id, { done: !tasks.items.find(t => t.id === id).done });
export const renameTask = (id, title) => patch(id, { title });
export const tickTask = id => patch(id, { secs: Math.max(0, tasks.items.find(t => t.id === id).secs - 1) });

export const removeTask = id => {
  set(tasks.items.filter(t => t.id !== id));
  Object.assign(tasks, { modal: null, selected: tasks.selected === id ? null : tasks.selected });
};

// Swap with the neighbour that is currently VISIBLE (a filter may hide the adjacent item).
export const moveTask = (id, dir, visibleIds) => {
  const other = visibleIds[visibleIds.indexOf(id) + dir];
  if (other == null) return;
  const items = tasks.items.slice();
  const a = items.findIndex(t => t.id === id), b = items.findIndex(t => t.id === other);
  [items[a], items[b]] = [items[b], items[a]];
  set(items);
};

export const select = id => { tasks.selected = id; };
export const setFilter = f => { tasks.filter = f; };
export const setQuery = q => { tasks.query = q; };
export const askDelete = id => { tasks.modal = { id }; };
export const closeModal = () => { tasks.modal = null; };
