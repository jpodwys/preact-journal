import { slice } from '../session.js';

// The notes slice. Three route chunks import it, so the bundler puts it in a chunk they share.
export const notes = slice('notes', () => ({ items: [] }));

let seq = 0;
const set = items => { notes.items = items; };

export const addNote = text => set([{ id: Date.now() * 1000 + (seq++ % 1000), text }, ...notes.items]);
export const editNote = (id, text) => set(notes.items.map(n => (n.id === id ? { ...n, text } : n)));
export const removeNote = id => set(notes.items.filter(n => n.id !== id));
export const findNote = id => notes.items.find(n => n.id === Number(id));
