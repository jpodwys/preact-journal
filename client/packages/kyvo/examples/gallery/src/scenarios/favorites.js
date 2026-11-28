import { h, store, watch } from 'kyvo/core';

const BOOKS = ['Dune', 'Emma', 'Kindred', 'Solaris'];
const KEY = 'gallery:favorites';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };

// `shown` is what you see right away. `saved` is what the server has confirmed.
const first = load();
const books = store({ shown: first, saved: first, offline: false, error: '' });
watch(books, key => { if (key === 'saved') localStorage.setItem(KEY, JSON.stringify(books.saved)); });

const request = () => new Promise((resolve, reject) => setTimeout(
  () => (books.offline ? reject(new Error('offline')) : resolve()), 400));

const withBook = (list, book, on) => (on ? [...list.filter(b => b !== book), book] : list.filter(b => b !== book));

// The newest request for each book. An older one that fails must not undo a newer choice.
const latest = {};

async function toggle(book) {
  const on = !books.shown.includes(book);
  const mine = latest[book] = (latest[book] || 0) + 1;
  Object.assign(books, { shown: withBook(books.shown, book, on), error: '' });
  try {
    await request();
    books.saved = withBook(books.saved, book, on);     // read the store again after await
  } catch (e) {
    if (latest[book] !== mine) return;
    books.shown = withBook(books.shown, book, books.saved.includes(book));
    books.error = 'Could not save ' + book + '. Your change was undone.';
  }
}

export default () => (
  <div>
    <label>
      <input type="checkbox" checked={books.offline} onchange={e => { books.offline = e.target.checked; }} /> Make saving fail
    </label>
    <ul>
      {BOOKS.map(book => (
        <li key={book}>
          <button aria-pressed={String(books.shown.includes(book))} onclick={() => toggle(book)}>
            {books.shown.includes(book) ? '★' : '☆'} {book}
          </button>
        </li>
      ))}
    </ul>
    {books.error && <p role="alert">{books.error}</p>}
    <p class="server">Server has: {books.saved.slice().sort().join(', ') || 'nothing'}</p>
  </div>
);
