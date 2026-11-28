// The routes, in order of difficulty. Each module is imported twice: to run, and (`?source`) as the text on the Code tab.
import Counter from './scenarios/counter.js';
import counterSource from './scenarios/counter.js?source';
import Cart from './scenarios/cart.js';
import cartSource from './scenarios/cart.js?source';
import Todos from './scenarios/todos.js';
import todosSource from './scenarios/todos.js?source';
import Settings from './scenarios/settings.js';
import settingsSource from './scenarios/settings.js?source';
import Search from './scenarios/search.js';
import searchSource from './scenarios/search.js?source';
import Preferences from './scenarios/preferences.js';
import preferencesSource from './scenarios/preferences.js?source';
import Stopwatch from './scenarios/stopwatch.js';
import stopwatchSource from './scenarios/stopwatch.js?source';
import Modal from './scenarios/modal.js';
import modalSource from './scenarios/modal.js?source';
import Profile from './scenarios/profile.js';
import profileSource from './scenarios/profile.js?source';
import Notes from './scenarios/notes.js';
import notesSource from './scenarios/notes.js?source';

export const scenarios = [
  {
    id: 'counter', title: 'Counter', teaches: 'ctx.state', Demo: Counter, source: counterSource,
    about: 'ctx.state gives a component an object that survives renders. Assign to a field and the app re-renders. There is no setter to call.',
    footgun: 'The object is created on the first render only. Changing the initial value you pass later does nothing.'
  },
  {
    id: 'cart', title: 'Shared cart', teaches: 'store', Demo: Cart, source: cartSource,
    about: 'A store is shared state. Any component reads it by name, and any write re-renders everything, so nothing needs to subscribe.',
    footgun: 'Replace values instead of changing them. cart.items.push(id) is not detected. A development build throws, but only once the array has been assigned through the store.'
  },
  {
    id: 'todos', title: 'Todo list', teaches: 'keys, per-row state', Demo: Todos, source: todosSource,
    about: 'Each row keeps its own editing flag. Start editing a row, then move another to the top: the flag stays with its todo because of the key.',
    footgun: 'Without a key, rows are matched by position, so row state moves to a different todo when the list changes.'
  },
  {
    id: 'settings', title: 'Settings form', teaches: 'form controls, styles', Demo: Settings, source: settingsSource,
    about: 'Bind each control by setting its value or checked, and storing what the event reports.',
    footgun: 'kyvo compares with the last value it rendered, not with the page. If your handler rejects input, the control still shows it.'
  },
  {
    id: 'search', title: 'Search a list', teaches: 'derived data, debounced', Demo: Search, source: searchSource,
    about: 'The matching names are computed during render. debounced delays the update until typing pauses.',
    footgun: 'A second debounced in one component needs its own key as the fourth argument.'
  },
  {
    id: 'preferences', title: 'Saved preferences', teaches: 'watch', Demo: Preferences, source: preferencesSource,
    about: 'watch runs a function after each changed write to a store. It suits persistence.',
    footgun: 'Calling watch in a component body adds another listener on every render. It cannot be removed.'
  },
  {
    id: 'stopwatch', title: 'Stopwatch', teaches: 'ctx.mount, live props', Demo: Stopwatch, source: stopwatchSource,
    about: 'ctx.mount starts work once and cleans it up on removal. Change the step while it runs: the timer picks it up without restarting.',
    footgun: 'In callbacks that outlive a render, read props.step. A destructured step is stale.'
  },
  {
    id: 'modal', title: 'Modal', teaches: 'listen, ref, conditional rendering', Demo: Modal, source: modalSource,
    about: 'The Escape listener exists only while the modal does. A ref receives the element once it is on the page.',
    footgun: 'A ref written inline is a new function each render, so it runs every render. Define it outside the component.'
  },
  {
    id: 'profile', title: 'Profile by id', teaches: 'effect, loading and errors', Demo: Profile, source: profileSource,
    about: 'effect restarts work when a listed value changes, and cleans up the previous run first. The list says only when to restart.',
    footgun: 'A value that should restart the work but is missing from the list fails silently.'
  },
  {
    id: 'notes', title: 'Autosaving notes', teaches: 'keyed debounced, key', Demo: Notes, source: notesSource,
    about: 'Type, then switch notes at once. The pending save still reaches the note you typed in.',
    footgun: 'Keep what the user typed somewhere that updates immediately. If only the debounced save stores it, switching back shows old text.'
  }
];
