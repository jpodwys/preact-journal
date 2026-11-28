import { store, watch } from '../../../core.js';

// The convention for state that lives in code which may not be loaded yet.
//
// kyvo has no store registry: a `store()` is just an object, any write to any store schedules the one whole-tree render,
// and a component reads whatever stores it likes. So a lazily loaded feature needs no registration to have state. It
// creates its own store when its code loads. `slice()` is the little bit of lifecycle that app code still wants:
//   - it hydrates from localStorage when it is created (a watcher attached later would miss earlier writes),
//   - it persists every write,
//   - it remembers how to reset itself, for "sign out" / "reset data".
// Resetting must also reach slices whose code never loaded in this session: their saved data is still in localStorage,
// so `resetAll` sweeps every key under the prefix, not just the slices it knows about.
const PREFIX = 'splitting:';
const resets = [];

export function slice(name, init) {
  const key = PREFIX + name;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch (e) { /* unreadable: start fresh */ }
  const state = store({ ...init(), ...saved });
  watch(state, () => localStorage.setItem(key, JSON.stringify(state)));
  resets.push(() => Object.assign(state, init()));
  return state;
}

export function resetAll() {
  resets.forEach(reset => reset());
  Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
}

// Which route chunks have been fetched so far. Lives in the first download, so Home can show it.
export const shell = store({ loaded: [] });
