import { h, store } from 'kyvo/core';

const todos = store({ items: [{ id: 1, text: 'Water plants' }, { id: 2, text: 'Call Sam' }], next: 3 });

const rename = (id, text) => { todos.items = todos.items.map(t => (t.id === id ? { ...t, text } : t)); };
const toTop = todo => { todos.items = [todo, ...todos.items.filter(t => t.id !== todo.id)]; };
const remove = id => { todos.items = todos.items.filter(t => t.id !== id); };

// Defined outside the component, so it runs once: when the element is created.
const focus = el => { if (el) el.focus(); };

function Row({ todo }, ctx) {
  // Each row has its own state. Its key keeps that state with the right todo when rows move.
  const s = ctx.state({ editing: false });
  return (
    <li>
      {s.editing
        ? <input aria-label="Title" ref={focus} value={todo.text} oninput={e => rename(todo.id, e.target.value)} />
        : <span class="title">{todo.text}</span>}
      <button onclick={() => { s.editing = !s.editing; }}>{s.editing ? 'Done' : 'Edit'}</button>
      <button onclick={() => toTop(todo)}>To top</button>
      <button onclick={() => remove(todo.id)}>Delete</button>
    </li>
  );
}

export default function Todos(props, ctx) {
  const s = ctx.state({ text: '' });
  const add = e => {
    e.preventDefault();
    if (!s.text.trim()) return;
    todos.items = [...todos.items, { id: todos.next++, text: s.text.trim() }];
    s.text = '';
  };
  return (
    <div>
      <form onsubmit={add}>
        <input aria-label="New todo" value={s.text} oninput={e => { s.text = e.target.value; }} />
        <button>Add</button>
      </form>
      <ul>{todos.items.map(todo => <Row key={todo.id} todo={todo} />)}</ul>
    </div>
  );
}
