const { expect } = window.chai;
import { h } from '../../../core.js';
import { App } from '../src/components.js';
import { tasks } from '../src/store.js';
import { api } from '../src/api.js';
import { mount, settle, wait, resetTasks, fire, get, query, queryAll, titles } from './harness.js';

const T = (id, title, extra) => ({ id, title, done: false, secs: 1500, ...extra });
const ABC = () => [T(1, 'alpha'), T(2, 'beta'), T(3, 'gamma')];

describe('Tasks example app', () => {
  let env, clock;
  const boot = (items = ABC()) => { resetTasks(items); env = mount(<App />); return env.host; };
  afterEach(async () => {
    if (clock) { clock.restore(); clock = null; }
    if (env) env.cleanup();
    env = null;
    await settle();
  });

  describe('adding', () => {
    it('adds a task from the form and clears the input', async () => {
      const host = boot([]);
      fire.type(get(host, 'textbox', 'New task'), 'write tests');
      fire.submit(get(host, 'form', 'Add task'));
      expect(titles(host)).to.deep.equal(['write tests']);
      expect(get(host, 'textbox', 'New task').value).to.equal('');
      expect(host.textContent).to.include('1 left');
    });

    it('validates only after the first submit attempt, and a fix clears the error', () => {
      const host = boot([]);
      expect(query(host, 'alert')).to.equal(null);
      fire.submit(get(host, 'form', 'Add task'));
      expect(get(host, 'alert').textContent).to.equal('Title required');
      fire.type(get(host, 'textbox', 'New task'), 'x'.repeat(41));
      expect(get(host, 'alert').textContent).to.equal('Too long');
      fire.input(get(host, 'textbox', 'New task'), 'fine');
      expect(query(host, 'alert')).to.equal(null);
      fire.submit(get(host, 'form', 'Add task'));
      expect(titles(host)).to.deep.equal(['fine']);
    });

    it('keeps typing intact across many rapid controlled-input updates', () => {
      const host = boot([]);
      const input = get(host, 'textbox', 'New task');
      fire.type(input, 'the quick brown fox');
      expect(get(host, 'textbox', 'New task')).to.equal(input); // same node, never recreated
      expect(input.value).to.equal('the quick brown fox');
    });

    it('two local state slots in one component stay independent', () => {
      const host = boot([]);
      for (const t of ['one', 'two']) { fire.type(get(host, 'textbox', 'New task'), t); fire.submit(get(host, 'form', 'Add task')); }
      expect(host.textContent).to.include('2 added this session');
      fire.input(get(host, 'textbox', 'New task'), 'draft');
      expect(host.textContent).to.include('2 added this session');
    });
  });

  describe('rows', () => {
    it('toggles done and updates the count and badge', () => {
      const host = boot();
      fire.change(get(host, 'checkbox', 'Toggle beta'));
      expect(tasks.items[1].done).to.equal(true);
      expect(host.textContent).to.include('2 left');
      expect(queryAll(host, 'list')[0].children[1].textContent).to.include('done');
    });

    it('edits a title: Enter saves, Escape cancels, blur saves, empty is ignored', () => {
      const host = boot();
      const edit = name => fire.click(get(host, 'button', 'Edit ' + name));
      edit('alpha');
      fire.input(get(host, 'textbox', 'Edit title'), 'ALPHA');
      fire.key(get(host, 'textbox', 'Edit title'), 'Enter');
      expect(titles(host)[0]).to.equal('ALPHA');

      edit('beta');
      fire.input(get(host, 'textbox', 'Edit title'), 'nope');
      fire.key(get(host, 'textbox', 'Edit title'), 'Escape');
      expect(titles(host)[1]).to.equal('beta');

      edit('gamma');
      fire.input(get(host, 'textbox', 'Edit title'), 'GAMMA');
      fire.blur(get(host, 'textbox', 'Edit title'));
      expect(titles(host)[2]).to.equal('GAMMA');

      edit('ALPHA');
      fire.input(get(host, 'textbox', 'Edit title'), '   ');
      fire.key(get(host, 'textbox', 'Edit title'), 'Enter');
      expect(titles(host)[0]).to.equal('ALPHA');
    });

    it('focuses the edit field when it appears (create-only ref)', () => {
      const host = boot();
      fire.click(get(host, 'button', 'Edit alpha'));
      expect(document.activeElement).to.equal(get(host, 'textbox', 'Edit title'));
    });

    it('per-row local state survives other rows moving, new rows and unrelated store writes', () => {
      const host = boot();
      fire.click(get(host, 'button', 'Edit beta'));
      fire.input(get(host, 'textbox', 'Edit title'), 'half-typed');
      const field = get(host, 'textbox', 'Edit title');
      fire.click(get(host, 'button', 'Up gamma'));          // beta's index changes, its DOM node does not move
      fire.type(get(host, 'textbox', 'New task'), 'delta');
      fire.submit(get(host, 'form', 'Add task'));
      fire.change(get(host, 'checkbox', 'Toggle alpha'));
      expect(tasks.items.map(t => t.title)).to.deep.equal(['alpha', 'gamma', 'beta', 'delta']);
      expect(get(host, 'textbox', 'Edit title')).to.equal(field);   // same element, still editing
      expect(field.value).to.equal('half-typed');
      expect(field.closest('li').textContent).to.include('Up beta');
    });

    it('the draft belongs to its row: another row can be edited without disturbing it', () => {
      const host = boot();
      fire.click(get(host, 'button', 'Edit alpha'));
      fire.input(get(host, 'textbox', 'Edit title'), 'A-draft');
      const first = get(host, 'textbox', 'Edit title');
      fire.click(get(host, 'button', 'Edit gamma'));
      const both = queryAll(host, 'textbox', 'Edit title');
      expect(both.length).to.equal(2);
      expect(both[0]).to.equal(first);
      expect(both[0].value).to.equal('A-draft');
      expect(both[1].value).to.equal('gamma');
    });

    it('moves rows up and down, with the end buttons disabled', () => {
      const host = boot();
      expect(get(host, 'button', 'Up alpha').disabled).to.equal(true);
      expect(get(host, 'button', 'Down gamma').disabled).to.equal(true);
      fire.click(get(host, 'button', 'Down alpha'));
      expect(tasks.items.map(t => t.title)).to.deep.equal(['beta', 'alpha', 'gamma']);
      fire.click(get(host, 'button', 'Up gamma'));
      expect(tasks.items.map(t => t.title)).to.deep.equal(['beta', 'gamma', 'alpha']);
    });

    it('moves relative to the VISIBLE neighbour when a filter hides the adjacent task', () => {
      const host = boot([T(1, 'a', { done: true }), T(2, 'b'), T(3, 'c', { done: true }), T(4, 'd')]);
      fire.click(get(host, 'button', 'active')); // shows b and d only
      fire.click(get(host, 'button', 'Down b'));
      expect(tasks.items.map(t => t.title)).to.deep.equal(['a', 'd', 'c', 'b']);
    });
  });

  describe('delete confirmation (conditional listener)', () => {
    it('opens a dialog; Cancel and Escape close it; Confirm deletes', () => {
      const host = boot();
      fire.click(get(host, 'button', 'Delete beta'));
      expect(get(host, 'dialog').textContent).to.include('Delete beta?');
      fire.click(get(host, 'button', 'Cancel'));
      expect(query(host, 'dialog')).to.equal(null);
      fire.click(get(host, 'button', 'Delete beta'));
      fire.key(document, 'Escape');
      expect(query(host, 'dialog')).to.equal(null);
      expect(tasks.items.length).to.equal(3);
      fire.click(get(host, 'button', 'Delete beta'));
      fire.click(get(host, 'button', 'Confirm'));
      expect(titles(host)).to.deep.equal(['alpha', 'gamma']);
    });

    it('the Escape listener exists only while the dialog is open', () => {
      const host = boot();
      const adds = [], removes = [];
      const add = document.addEventListener, rem = document.removeEventListener;
      document.addEventListener = function (t, ...r) { adds.push(t); return add.call(this, t, ...r); };
      document.removeEventListener = function (t, ...r) { removes.push(t); return rem.call(this, t, ...r); };
      try {
        fire.click(get(host, 'button', 'Delete beta'));
        fire.click(get(host, 'button', 'Cancel'));
        fire.click(get(host, 'button', 'Delete beta'));
        fire.click(get(host, 'button', 'Cancel'));
      } finally { document.addEventListener = add; document.removeEventListener = rem; }
      expect(adds.filter(t => t === 'keydown').length).to.equal(2);
      expect(removes.filter(t => t === 'keydown').length).to.equal(2);
    });

    it('focuses the confirm button when the dialog opens', () => {
      const host = boot();
      fire.click(get(host, 'button', 'Delete beta'));
      expect(document.activeElement).to.equal(get(host, 'button', 'Confirm'));
    });

    it('deleting the selected task closes its details', async () => {
      const host = boot();
      fire.click(get(host, 'button', 'beta'));
      await settle();
      fire.click(get(host, 'button', 'Delete beta'));
      fire.click(get(host, 'button', 'Confirm'));
      expect(query(host, 'region', 'Details')).to.equal(null);
    });
  });

  describe('details fetch (a new instance per selection, with cancellation)', () => {
    it('shows Loading, then the notes', async () => {
      const host = boot();
      fire.click(get(host, 'button', 'alpha'));
      expect(get(host, 'region', 'Details').textContent).to.include('Loading');
      await wait(60);
      await settle();
      expect(get(host, 'region', 'Details').textContent).to.include('Notes for task 1');
    });

    it('a slow response for a previous selection never overwrites the current one', async () => {
      const pending = {};
      const orig = api.notes;
      api.notes = id => new Promise(r => { pending[id] = r; });
      try {
        const host = boot();
        fire.click(get(host, 'button', 'alpha'));
        fire.click(get(host, 'button', 'beta'));
        pending[2]('beta notes');
        await settle();
        pending[1]('STALE alpha notes');
        await settle();
        expect(get(host, 'region', 'Details').textContent).to.include('beta notes');
        expect(get(host, 'region', 'Details').textContent).to.not.include('STALE');
      } finally { api.notes = orig; }
    });

    it('a response that lands after the details closed is ignored without errors', async () => {
      let resolve;
      const orig = api.notes;
      api.notes = () => new Promise(r => { resolve = r; });
      try {
        const host = boot();
        fire.click(get(host, 'button', 'alpha'));
        tasks.selected = null;
        await settle();
        resolve('late');
        await settle();
        expect(query(host, 'region', 'Details')).to.equal(null);
      } finally { api.notes = orig; }
    });
  });

  describe('filter and search', () => {
    it('filters by status and by debounced search text, combined', async () => {
      const host = boot([T(1, 'alpha', { done: true }), T(2, 'alpine'), T(3, 'beta')]);
      fire.click(get(host, 'button', 'active'));
      expect(titles(host)).to.deep.equal(['alpine', 'beta']);
      fire.input(get(host, 'textbox', 'Search'), 'al');
      expect(titles(host)).to.deep.equal(['alpine', 'beta']); // debounced: not applied yet
      await wait(100);
      await settle();
      expect(titles(host)).to.deep.equal(['alpine']);
      fire.click(get(host, 'button', 'all'));
      expect(titles(host)).to.deep.equal(['alpha', 'alpine']);
      expect(get(host, 'button', 'all').getAttribute('aria-pressed')).to.equal('true');
    });

    it('the search box value follows the store without losing typing in between', async () => {
      const host = boot();
      const box = get(host, 'textbox', 'Search');
      fire.input(box, 'a');
      fire.input(box, 'al');
      await wait(100);
      await settle();
      expect(get(host, 'textbox', 'Search')).to.equal(box);
      expect(box.value).to.equal('al');
    });
  });

  describe('timer (an interval that runs while the row does)', () => {
    // effect() starts and stops the interval in a microtask after the render that saw the change.
    const toggle = async button => { fire.click(button); await Promise.resolve(); };
    const fake = () => { clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }); };

    it('counts down while running, stops on Pause, resumes on Start', async () => {
      fake();
      const host = boot();
      await toggle(get(host, 'button', 'Start alpha'));
      clock.tick(3000);
      await settle();
      expect(tasks.items[0].secs).to.equal(1497);
      await toggle(get(host, 'button', 'Pause alpha'));
      clock.tick(5000);
      await settle();
      expect(tasks.items[0].secs).to.equal(1497);
      await toggle(get(host, 'button', 'Start alpha'));
      clock.tick(1000);
      expect(tasks.items[0].secs).to.equal(1496);
      await settle();
      expect(host.textContent).to.include('24:56');
    });

    it('shows mm:ss and stops at zero', async () => {
      fake();
      const host = boot([T(1, 'alpha', { secs: 3 })]);
      await toggle(get(host, 'button', 'Start alpha'));
      clock.tick(10000);
      await settle();
      expect(tasks.items[0].secs).to.equal(0);
      expect(host.textContent).to.include('0:00');
      expect(get(host, 'button', 'Start alpha')).to.exist; // not stuck on "Pause"
    });

    it('deleting a running task clears its interval (nothing ticks afterwards)', async () => {
      fake();
      const host = boot();
      await toggle(get(host, 'button', 'Start alpha'));
      fire.click(get(host, 'button', 'Delete alpha'));
      fire.click(get(host, 'button', 'Confirm'));
      await settle();
      expect(Object.keys(clock.timers || {}).length).to.equal(0);
      expect(() => clock.tick(5000)).to.not.throw();
    });

    it('two rows can run at once, independently', async () => {
      fake();
      const host = boot();
      await toggle(get(host, 'button', 'Start alpha'));
      await toggle(get(host, 'button', 'Start beta'));
      clock.tick(2000);
      await settle();
      expect(tasks.items.map(t => t.secs)).to.deep.equal([1498, 1498, 1500]);
    });
  });

  describe('persistence', () => {
    it('writes items to localStorage on every change', () => {
      const host = boot([]);
      fire.type(get(host, 'textbox', 'New task'), 'persist me');
      fire.submit(get(host, 'form', 'Add task'));
      expect(JSON.parse(localStorage.getItem('tasks-v1'))[0].title).to.equal('persist me');
    });

    it('does not persist transient UI state (filter, query, modal, selection)', () => {
      const host = boot();
      const before = localStorage.getItem('tasks-v1');
      fire.click(get(host, 'button', 'active'));
      fire.input(get(host, 'textbox', 'Search'), 'x');
      fire.click(get(host, 'button', 'alpha'));
      fire.click(get(host, 'button', 'Delete alpha'));
      expect(tasks.modal).to.not.equal(null);
      expect(localStorage.getItem('tasks-v1')).to.equal(before);
    });
  });
});
