import { h } from '../../../core.js';
import { lazy } from '../../../helpers.js';
import { resetAll, shell } from './session.js';
import { Routes, Link, nav } from './router.js';

// Everything in this file is in the first download: the shell, the home page and the loading states.
export const Loading = () => <p role="status">Loading…</p>;

export const Failed = ({ retry }) => (
  <p role="alert">Could not load this page. <button onclick={retry}>Retry</button></p>
);

const NotFound = ({ path }) => <p role="alert">Nothing at {path}</p>;

const Home = () => (
  <section aria-label="Home">
    <h1>Field notes</h1>
    <p>A tiny app whose pages are separate files: each route's code is fetched the first time you visit it.</p>
    <p aria-label="Loaded">Loaded so far: {shell.loaded.length ? shell.loaded.join(', ') : 'nothing yet'}</p>
  </section>
);

// A route page: `lazy()` around a dynamic import, plus a note of the fetch for Home to show.
const page = (name, load) => lazy(
  () => load().then(m => { shell.loaded = [...shell.loaded, name]; return m; }),
  Loading,
  Failed
);

// The route table. The `import()` calls are what the bundler cuts into separate files.
export const routes = [
  ['/', Home],
  ['/notes', page('notes', () => import('./pages/notes.js'))],
  ['/notes/:id', page('note', () => import('./pages/note.js'))],
  ['/stats', page('stats', () => import('./pages/stats.js'))]
];

export const App = () => (
  <div>
    <nav aria-label="Main">
      <Link to="/">Home</Link> <Link to="/notes">Notes</Link> <Link to="/stats">Stats</Link>
      <button onclick={resetAll}>Reset data</button>
    </nav>
    <main aria-current={nav.path}>
      <Routes routes={routes} notFound={NotFound} />
    </main>
  </div>
);
