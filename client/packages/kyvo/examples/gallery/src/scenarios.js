// The routes, in order of difficulty. Each file is imported twice: to run, and (`?source`) as the text on the Code tab.
// In a scenario with several files, the first is its entry.
import Hello from './scenarios/hello.js';
import helloSource from './scenarios/hello.js?source';
import Props from './scenarios/props.js';
import propsSource from './scenarios/props.js?source';
import Children from './scenarios/children.js';
import childrenSource from './scenarios/children.js?source';
import Lists from './scenarios/lists.js';
import listsSource from './scenarios/lists.js?source';
import Counter from './scenarios/counter.js';
import counterSource from './scenarios/counter.js?source';
import Events from './scenarios/events.js';
import eventsSource from './scenarios/events.js?source';
import Conditional from './scenarios/conditional.js';
import conditionalSource from './scenarios/conditional.js?source';
import TextInput from './scenarios/text-input.js';
import textInputSource from './scenarios/text-input.js?source';
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
import Metronome from './scenarios/metronome.js';
import metronomeSource from './scenarios/metronome.js?source';
import Notes from './scenarios/notes.js';
import notesSource from './scenarios/notes.js?source';
import Tabs from './scenarios/tabs.js';
import tabsSource from './scenarios/tabs.js?source';
import Signup from './scenarios/signup.js';
import signupSource from './scenarios/signup.js?source';
import Table from './scenarios/table.js';
import tableSource from './scenarios/table.js?source';
import Undo from './scenarios/undo.js';
import undoSource from './scenarios/undo.js?source';
import Reorder from './scenarios/reorder.js';
import reorderSource from './scenarios/reorder.js?source';
import Chart from './scenarios/chart.js';
import chartSource from './scenarios/chart.js?source';
import Favorites from './scenarios/favorites.js';
import favoritesSource from './scenarios/favorites.js?source';
import Chat from './scenarios/chat.js';
import chatSource from './scenarios/chat.js?source';
import Mail from './scenarios/mail/index.js';
import mailIndexSource from './scenarios/mail/index.js?source';
import mailStoreSource from './scenarios/mail/store.js?source';
import mailListSource from './scenarios/mail/list.js?source';
import mailMessageSource from './scenarios/mail/message.js?source';
import Kanban from './scenarios/kanban/index.js';
import kanbanIndexSource from './scenarios/kanban/index.js?source';
import kanbanStoreSource from './scenarios/kanban/store.js?source';
import kanbanColumnSource from './scenarios/kanban/column.js?source';
import kanbanEditorSource from './scenarios/kanban/editor.js?source';
import kanbanSettingsSource from './scenarios/kanban/settings.js?source';

const file = (name, source) => ({ name, source });

export const scenarios = [
  {
    stage: 'Basics', id: 'hello', title: 'Hello', teaches: 'components, JSX', Demo: Hello, files: [file('hello.js', helloSource)],
    about: 'A component is a plain function that returns what to show. Braces drop a JavaScript value into the markup.',
    footgun: 'A component returns one element. To show siblings, wrap them in one; returning an array throws.'
  },
  {
    stage: 'Basics', id: 'props', title: 'Props', teaches: 'passing data down', Demo: Props, files: [file('props.js', propsSource)],
    about: 'A parent passes values like attributes, and the component receives them in props. Defaults are ordinary JavaScript.',
    footgun: 'times="2" passes the string "2", not the number. Use braces for anything that is not a string.'
  },
  {
    stage: 'Basics', id: 'children', title: 'Children', teaches: 'composition', Demo: Children, files: [file('children.js', childrenSource)],
    about: 'A component can wrap whatever is put between its tags, which is how layout pieces are built.',
    footgun: 'props.children is always an array, even for a single child.'
  },
  {
    stage: 'Basics', id: 'lists', title: 'Lists', teaches: 'map, key', Demo: Lists, files: [file('lists.js', listsSource)],
    about: 'There is no loop syntax: build the elements with map.',
    footgun: 'Give each item a key that is unique among its siblings. A development build throws on a duplicate.'
  },
  {
    stage: 'State', id: 'counter', title: 'Counter', teaches: 'ctx.state', Demo: Counter, files: [file('counter.js', counterSource)],
    about: 'ctx.state gives a component an object that survives renders. Assign to a field and the app re-renders. There is no setter to call.',
    footgun: 'The object is created on the first render only. Changing the initial value you pass later does nothing.'
  },
  {
    stage: 'State', id: 'events', title: 'Events', teaches: 'handlers', Demo: Events, files: [file('events.js', eventsSource)],
    about: 'Attributes starting with "on" are event handlers, and they receive the browser event itself.',
    footgun: 'onclick={save()} calls save during every render. Write onclick={save} or onclick={() => save()}.'
  },
  {
    stage: 'State', id: 'conditional', title: 'Show and hide', teaches: 'conditional rendering', Demo: Conditional, files: [file('conditional.js', conditionalSource)],
    about: 'Use a ternary to pick between two things, and && to show something or nothing.',
    footgun: 'With a number on the left, as in count && ..., a count of 0 is shown as "0". Compare first: count > 0 && ...'
  },
  {
    stage: 'State', id: 'text-input', title: 'Text input', teaches: 'value, oninput', Demo: TextInput, files: [file('text-input.js', textInputSource)],
    about: 'State holds the text, the input shows it, and each keystroke writes it back.',
    footgun: 'Use oninput for every keystroke. onchange is the browser event, which fires when the field is committed.'
  },
  {
    stage: 'State', id: 'cart', title: 'Shared cart', teaches: 'store', Demo: Cart, files: [file('cart.js', cartSource)],
    about: 'A store is shared state. Any component reads it by name, and any write re-renders everything, so nothing needs to subscribe.',
    footgun: 'Replace values instead of changing them. cart.items.push(id) is not detected. A development build throws, but only once the array has been assigned through the store.'
  },
  {
    stage: 'State', id: 'todos', title: 'Todo list', teaches: 'keys, per-row state', Demo: Todos, files: [file('todos.js', todosSource)],
    about: 'Each row keeps its own editing flag. Start editing a row, then move another to the top: the flag stays with its todo because of the key.',
    footgun: 'Without a key, rows are matched by position, so row state moves to a different todo when the list changes.'
  },
  {
    stage: 'Forms and data', id: 'settings', title: 'Settings form', teaches: 'form controls, styles', Demo: Settings, files: [file('settings.js', settingsSource)],
    about: 'Bind each control by setting its value or checked, and storing what the event reports.',
    footgun: 'kyvo compares with the last value it rendered, not with the page. If your handler rejects input, the control still shows it.'
  },
  {
    stage: 'Forms and data', id: 'search', title: 'Search a list', teaches: 'derived data, debounced', Demo: Search, files: [file('search.js', searchSource)],
    about: 'The matching names are computed during render. debounced delays the update until typing pauses.',
    footgun: 'A second debounced in one component needs its own key as the fourth argument.'
  },
  {
    stage: 'Forms and data', id: 'preferences', title: 'Saved preferences', teaches: 'watch', Demo: Preferences, files: [file('preferences.js', preferencesSource)],
    about: 'watch runs a function after each changed write to a store. It suits persistence.',
    footgun: 'Calling watch in a component body adds another listener on every render. It cannot be removed.'
  },
  {
    stage: 'Lifecycle', id: 'stopwatch', title: 'Stopwatch', teaches: 'ctx.mount, live props', Demo: Stopwatch, files: [file('stopwatch.js', stopwatchSource)],
    about: 'ctx.mount starts work once and cleans it up on removal. Change the step while it runs: the timer picks it up without restarting.',
    footgun: 'In callbacks that outlive a render, read props.step. A destructured step is stale.'
  },
  {
    stage: 'Lifecycle', id: 'modal', title: 'Modal', teaches: 'listen, ref, conditional rendering', Demo: Modal, files: [file('modal.js', modalSource)],
    about: 'The Escape listener exists only while the modal does. A ref receives the element once it is on the page.',
    footgun: 'A ref written inline is a new function each render, so it runs every render. Define it outside the component.'
  },
  {
    stage: 'Lifecycle', id: 'profile', title: 'Profile by id', teaches: 'key, loading and errors', Demo: Profile, files: [file('profile.js', profileSource)],
    about: 'Write a message on both cards, then pick another user. The card without a key keeps the old name and your message. The keyed card starts over and loads the new user.',
    footgun: 'Use the keyed form. Without a key nothing warns you: the card quietly goes on showing the first user.'
  },
  {
    stage: 'Lifecycle', id: 'metronome', title: 'Metronome', teaches: 'effect', Demo: Metronome, files: [file('metronome.js', metronomeSource)],
    about: 'effect restarts one piece of work when a listed value changes, while the component and its state stay. Change the speed: the timer is replaced and the count carries on. A key would reset the count.',
    footgun: 'A value that should restart the work but is missing from the list fails silently. With an empty list, the speed would never change.'
  },
  {
    stage: 'Lifecycle', id: 'notes', title: 'Autosaving notes', teaches: 'keyed debounced, key', Demo: Notes, files: [file('notes.js', notesSource)],
    about: 'Type, then switch notes at once. The pending save still reaches the note you typed in.',
    footgun: 'Keep what the user typed somewhere that updates immediately. If only the debounced save stores it, switching back shows old text.'
  },
  {
    stage: 'Building blocks', id: 'tabs', title: 'Tabs and accordion', teaches: 'reusable components', Demo: Tabs, files: [file('tabs.js', tabsSource)],
    about: 'Tabs reads the title of each child, and each accordion section keeps its own state. Neither knows what it contains.',
    footgun: 'A conditional child that is off arrives in props.children as an empty string. Skip it before reading child.props.'
  },
  {
    stage: 'Building blocks', id: 'signup', title: 'Sign-up form', teaches: 'validation, async submit', Demo: Signup, files: [file('signup.js', signupSource)],
    about: 'Errors are computed from the fields on each render. While the request runs the button is disabled, so it cannot be sent twice.',
    footgun: 'After an await, the component may have been removed. Writing to its state then does nothing, so do not rely on it for work that must happen.'
  },
  {
    stage: 'Building blocks', id: 'table', title: 'Data table', teaches: 'derived data', Demo: Table, files: [file('table.js', tableSource)],
    about: 'Only the search text, sort, page and selection are stored. The visible rows are worked out from those on every render.',
    footgun: 'Clamp what you store against what you derive. A filter can leave the stored page past the last one.'
  },
  {
    stage: 'Interaction and time', id: 'undo', title: 'Undo and redo', teaches: 'history, listen', Demo: Undo, files: [file('undo.js', undoSource)],
    about: 'Because values are replaced and never changed, the history is simply the old values. Paint, then undo with the buttons or Ctrl/Cmd+Z.',
    footgun: 'This only works if nothing mutates an old array. One push or index assignment would rewrite history.'
  },
  {
    stage: 'Interaction and time', id: 'reorder', title: 'Drag to reorder', teaches: 'keys, drag events', Demo: Reorder, files: [file('reorder.js', reorderSource)],
    about: 'Type a note in a row, then drag it or use the arrows. The row moves with its note, because the key identifies it.',
    footgun: 'Without keys the text typed in a row would stay at its position while the titles moved.'
  },
  {
    stage: 'Interaction and time', id: 'chart', title: 'Live chart', teaches: 'effect, SVG', Demo: Chart, files: [file('chart.js', chartSource)],
    about: 'effect restarts the data timer when you change feed or pause, while the points already drawn stay.',
    footgun: 'The timer callback reads s.values each time. A copy taken when the effect started would lose every point added since.'
  },
  {
    stage: 'Async and sync', id: 'favorites', title: 'Optimistic favorites', teaches: 'async actions, rollback', Demo: Favorites, files: [file('favorites.js', favoritesSource)],
    about: 'A star changes at once and is saved afterwards. Turn on failing saves to watch it roll back.',
    footgun: 'Roll back to what the server confirmed, not to a value read before the await, and ignore failures that a newer click has replaced.'
  },
  {
    stage: 'Async and sync', id: 'chat', title: 'Chat rooms', teaches: 'effect, drafts, autoscroll', Demo: Chat, files: [file('chat.js', chatSource)],
    about: 'One effect keeps a connection per room and another scrolls to new messages. Each room keeps its own unsent draft.',
    footgun: 'Capture the room in the effect. A late message handled by reading props.room would be filed under the room you moved to.'
  },
  {
    stage: 'Whole apps', id: 'mail', title: 'Mail reader', teaches: 'routing, shared store, shortcuts', Demo: Mail, files: [file('index.js', mailIndexSource), file('store.js', mailStoreSource), file('list.js', mailListSource), file('message.js', mailMessageSource)],
    about: 'The open message is in the address, so Back works. The code is split into a store, a list and a message view.',
    footgun: 'The key on the message view empties the reply box when you move on. Put drafts in the store if they should survive.'
  },
  {
    stage: 'Whole apps', id: 'kanban', title: 'Kanban board', teaches: 'everything together', Demo: Kanban, files: [file('index.js', kanbanIndexSource), file('store.js', kanbanStoreSource), file('column.js', kanbanColumnSource), file('editor.js', kanbanEditorSource), file('settings.js', kanbanSettingsSource)],
    about: 'A store with saved state, keyed columns and cards, dragging, an edit dialog, debounced search and a lazily loaded panel.',
    footgun: 'The editor copies the title when it opens. Its key is what makes it copy again for another card.'
  }
];
