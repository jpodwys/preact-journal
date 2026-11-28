import { store, watch } from 'kyvo/core';

export const COLUMNS = ['To do', 'Doing', 'Done'];
const KEY = 'gallery:kanban';

const starter = () => [
  { id: 1, title: 'Write the docs', column: 'To do' },
  { id: 2, title: 'Add examples', column: 'Doing' },
  { id: 3, title: 'Ship it', column: 'To do' }
];

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const saved = load();

export const board = store({ cards: saved.cards || starter() });
export const prefs = store({ compact: !!saved.compact });

// One place saves, so no action can forget to.
const save = () => localStorage.setItem(KEY, JSON.stringify({ cards: board.cards, compact: prefs.compact }));
watch(board, save);
watch(prefs, save);

const change = (id, fields) => { board.cards = board.cards.map(c => (c.id === id ? { ...c, ...fields } : c)); };

export const find = id => board.cards.find(c => c.id === id);
export const add = title => {
  const id = board.cards.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  board.cards = [...board.cards, { id, title, column: COLUMNS[0] }];
};
export const moveTo = (id, column) => change(id, { column });
export const rename = (id, title) => change(id, { title });
export const remove = id => { board.cards = board.cards.filter(c => c.id !== id); };
export const reset = () => { board.cards = starter(); };
