import { h } from '../../../core.js';
import { listen, debounced, effect } from '../../../helpers.js';
import { tasks, visible } from './store.js';
import { api } from './api.js';
import {
  addTask, toggleTask, renameTask, removeTask, moveTask, tickTask,
  select, setFilter, setQuery, askDelete, closeModal
} from './actions.js';

const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

// Stable (module-level) refs run once, when their element is created.
const focusEl = el => { if (el) el.focus(); };

const Badge = ({ done }) => <span class="badge">{done ? 'done' : 'open'}</span>;

function TaskRow({ task, index, last, ids }, ctx) {
  const s = ctx.state({ editing: false, draft: '', running: false });
  const running = s.running && task.secs > 0;
  effect(ctx, () => {
    if (!running) return;
    const t = setInterval(() => tickTask(task.id), 1000);
    return () => clearInterval(t);
  }, [running]);
  const save = () => {
    const title = s.draft.trim();
    if (title) renameTask(task.id, title);
    s.editing = false;
  };
  const keys = e => {
    if (e.key === 'Enter') save();
    else if (e.key === 'Escape') s.editing = false;
  };
  return (
    <li class={task.done ? 'done' : ''}>
      <input type="checkbox" checked={task.done} aria-label={'Toggle ' + task.title} onchange={() => toggleTask(task.id)} />
      {s.editing
        ? <input aria-label="Edit title" value={s.draft} ref={focusEl}
            oninput={e => { s.draft = e.target.value; }} onkeydown={keys} onblur={save} />
        : <button class="title" onclick={() => select(task.id)}>{task.title}</button>}
      <Badge done={task.done} />
      {!s.editing && <button onclick={() => Object.assign(s, { editing: true, draft: task.title })}>Edit {task.title}</button>}
      <span class="clock">{fmt(task.secs)}</span>
      <button onclick={() => { s.running = !running; }}>{running ? 'Pause' : 'Start'} {task.title}</button>
      <button disabled={index === 0} onclick={() => moveTask(task.id, -1, ids)}>Up {task.title}</button>
      <button disabled={last} onclick={() => moveTask(task.id, 1, ids)}>Down {task.title}</button>
      <button onclick={() => askDelete(task.id)}>Delete {task.title}</button>
    </li>
  );
}

function AddForm(props, ctx) {
  // Two independent local slots in one component: the default one and a keyed one.
  const f = ctx.state({ title: '', touched: false });
  const stats = ctx.state({ added: 0 }, 'stats');
  const title = f.title.trim();
  const error = !f.touched ? '' : !title ? 'Title required' : title.length > 40 ? 'Too long' : '';
  const submit = e => {
    e.preventDefault();
    f.touched = true;
    if (title && title.length <= 40) {
      addTask(title);
      Object.assign(f, { title: '', touched: false });
      stats.added++;
    }
  };
  return (
    <form onsubmit={submit} aria-label="Add task">
      <input aria-label="New task" value={f.title} oninput={e => { f.title = e.target.value; }} />
      <button type="submit">Add</button>
      {error && <span role="alert">{error}</span>}
      <small>{stats.added} added this session</small>
    </form>
  );
}

function SearchBox(props, ctx) {
  const search = debounced(ctx, e => setQuery(e.target.value), 60);
  return <input aria-label="Search" value={tasks.query} oninput={search} />;
}

const Filters = () => (
  <div role="group" aria-label="Filter">
    {['all', 'active', 'done'].map(f =>
      <button key={f} aria-pressed={String(tasks.filter === f)} onclick={() => setFilter(f)}>{f}</button>)}
  </div>
);

// Mounted with key={id}, so a new selection is a new instance: the fetch runs from
// mount and its cleanup cancels a stale response. No effect dependency list.
function Detail({ id }, ctx) {
  const s = ctx.state({ notes: null });
  ctx.mount(() => {
    let alive = true;
    api.notes(id).then(n => { if (alive) s.notes = n; });
    return () => { alive = false; };
  });
  return <section aria-label="Details"><h2>Task {id}</h2><p>{s.notes === null ? 'Loading…' : s.notes}</p></section>;
}

// Rendered only while open, so its Escape listener exists exactly while it is open.
function Confirm({ id }, ctx) {
  listen(ctx, document, 'keydown', e => { if (e.key === 'Escape') closeModal(); });
  const task = tasks.items.find(t => t.id === id);
  return (
    <div role="dialog" aria-label="Confirm delete">
      <p>Delete {task ? task.title : 'task'}?</p>
      <button ref={focusEl} onclick={() => removeTask(id)}>Confirm</button>
      <button onclick={closeModal}>Cancel</button>
    </div>
  );
}

export const App = () => {
  const items = visible();
  const ids = items.map(t => t.id);
  const left = tasks.items.filter(t => !t.done).length;
  return (
    <main>
      <h1>Tasks</h1>
      <AddForm />
      <SearchBox />
      <Filters />
      <ul aria-label="Task list">
        {items.map((t, i) => <TaskRow key={t.id} task={t} index={i} last={i === items.length - 1} ids={ids} />)}
      </ul>
      <p>{left} left</p>
      {tasks.selected != null && <Detail key={tasks.selected} id={tasks.selected} />}
      {tasks.modal && <Confirm id={tasks.modal.id} />}
    </main>
  );
};
