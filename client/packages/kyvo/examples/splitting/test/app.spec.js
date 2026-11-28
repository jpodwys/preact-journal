const { expect } = window.chai;
import { h } from '../../../core.js';
import { App, routes } from '../src/components.js';
import { nav, match } from '../src/router.js';
import { slice, resetAll, shell } from '../src/session.js';
import { notes } from '../src/slices/notes.js';
import { mount, settle, fire, get, query, all } from './harness.js';

// The specs bundle everything into one file, so the dynamic import()s are resolved inline: this checks the app's
// logic. That the pages really are separate files, fetched on demand, is checked in a real browser by split.spec.js.
const go = async path => { location.hash = '#' + path; nav.path = path; await settle(); };

describe('router', () => {
  it('matches literal segments and returns params for :names', () => {
    expect(match('/notes', '/notes')).to.deep.equal({});
    expect(match('/notes/:id', '/notes/7')).to.deep.equal({ id: '7' });
    expect(match('/notes/:id', '/notes/a%20b')).to.deep.equal({ id: 'a b' });
  });

  it('does not match a different literal, or a different depth', () => {
    expect(match('/notes', '/stats')).to.equal(null);
    expect(match('/notes/:id', '/notes')).to.equal(null);
    expect(match('/notes', '/notes/7')).to.equal(null);
  });
});

describe('slice()', () => {
  beforeEach(() => { localStorage.clear(); resetAll(); });

  it('hydrates from localStorage, persists every write, and resets to its initial state', () => {
    localStorage.setItem('splitting:demo', JSON.stringify({ n: 5 }));
    const s = slice('demo', () => ({ n: 0, tag: 'x' }));
    expect(s.n).to.equal(5);                      // saved value wins
    expect(s.tag).to.equal('x');                  // keys the save never had come from init
    s.n = 6;
    expect(JSON.parse(localStorage.getItem('splitting:demo')).n).to.equal(6);
    resetAll();
    expect(s.n).to.equal(0);
  });

  it('resetAll() also removes saved data of slices whose code never loaded', () => {
    localStorage.setItem('splitting:never-loaded', '{"a":1}');
    localStorage.setItem('unrelated', 'keep');
    resetAll();
    expect(localStorage.getItem('splitting:never-loaded')).to.equal(null);
    expect(localStorage.getItem('unrelated')).to.equal('keep');
  });

  it('starts from init when the saved value is unreadable', () => {
    localStorage.setItem('splitting:broken', '{nope');
    expect(slice('broken', () => ({ k: 1 })).k).to.equal(1);
  });
});

describe('Field notes app', () => {
  let env;
  const boot = async (path = '/') => { await go(path); env = mount(<App />); await settle(); return env.host; };
  beforeEach(() => { localStorage.clear(); resetAll(); shell.loaded = []; });
  afterEach(async () => { if (env) env.cleanup(); env = null; await go('/'); });

  it('shows Home first, with nothing loaded yet', async () => {
    const host = await boot();
    expect(get(host, 'region', 'Home')).to.exist;
    expect(get(host, 'region', 'Home').textContent).to.include('Loaded so far: nothing yet');
  });

  it('Home lists the route chunks that have been fetched', async () => {
    const host = await boot();
    await go('/notes');
    expect(get(host, 'region', 'Notes')).to.exist;
    await go('/');
    expect(get(host, 'region', 'Home').textContent).to.include('Loaded so far: notes');
  });

  it('says so for a path no route matches', async () => {
    const host = await boot('/nowhere');
    expect(get(host, 'alert').textContent).to.equal('Nothing at /nowhere');
  });

  it('adds a note, which persists under the slice key, and opens it', async () => {
    const host = await boot('/notes');
    expect(host.textContent).to.include('No notes yet.');
    fire.input(get(host, 'textbox', 'New note'), 'buy more milk');
    fire.submit(get(host, 'form', 'Add note'));
    await settle();
    expect(get(host, 'list', 'Note list').textContent).to.equal('buy more milk');
    expect(JSON.parse(localStorage.getItem('splitting:notes')).items[0].text).to.equal('buy more milk');
    const href = query(host, 'link', 'buy more milk').getAttribute('href');
    await go(href.slice(1));
    expect(get(host, 'textbox', 'Note text').value).to.equal('buy more milk');
  });

  it('edits and deletes a note from its page', async () => {
    const host = await boot('/notes');
    fire.input(get(host, 'textbox', 'New note'), 'draft');
    fire.submit(get(host, 'form', 'Add note'));
    const id = notes.items[0].id;
    await go('/notes/' + id);
    fire.input(get(host, 'textbox', 'Note text'), 'final');
    expect(notes.items[0].text).to.equal('final');
    fire.click(get(host, 'button', 'Delete'));
    await go('/notes');
    expect(notes.items).to.deep.equal([]);
  });

  it('says a note is gone when its id is unknown', async () => {
    const host = await boot('/notes/999');
    await settle();
    expect(get(host, 'alert').textContent).to.include('That note is gone.');
  });

  it('counts words across the notes, ignoring stop words, and persists the sort order', async () => {
    const host = await boot('/notes');
    for (const text of ['the cat and the hat', 'a cat sat']) {
      fire.input(get(host, 'textbox', 'New note'), text);
      fire.submit(get(host, 'form', 'Add note'));
    }
    await go('/stats');
    const words = () => Array.from(get(host, 'list', 'Words').children).map(li => li.textContent);
    expect(words()).to.deep.equal(['cat 2', 'hat 1', 'sat 1']);
    fire.click(get(host, 'button', /Sort/));
    expect(get(host, 'button', /Sort/).textContent).to.equal('Sort: alpha');
    expect(JSON.parse(localStorage.getItem('splitting:stats-ui')).sort).to.equal('alpha');
  });

  it('Reset data empties the loaded slices and every saved key under the prefix', async () => {
    const host = await boot('/notes');
    fire.input(get(host, 'textbox', 'New note'), 'to be wiped');
    fire.submit(get(host, 'form', 'Add note'));
    localStorage.setItem('splitting:from-a-chunk-never-loaded', '1');
    fire.click(get(host, 'button', 'Reset data'));
    await settle();
    expect(notes.items).to.deep.equal([]);
    expect(Object.keys(localStorage).filter(k => k.startsWith('splitting:'))).to.deep.equal([]);
  });

  it('every route in the table is either a plain component or has preload()', () => {
    expect(routes.map(([p, C]) => p + (C.preload ? ':lazy' : ':eager'))).to.deep.equal(['/:eager', '/notes:lazy', '/notes/:id:lazy', '/stats:lazy']);
  });
});
