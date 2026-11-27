import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { clear as idbClear } from 'idb-keyval';
import { mount, fireEvent, nextRender } from '../../../test/mount';
import { app, viewEntries } from '../../js/app-state';
import { saveAccounts } from '../../../test/accounts';
import { resetDataFetched } from '../../js/actions/entry-actions';
import { mockUnmatchedFail } from '../../../test/api-mocks';
import App from './index';

// The framework's only scheduler: a store write schedules ONE
// requestAnimationFrame render of the whole tree. Proven here against the
// real <App>, with a counting probe rendered beside it in the same root
// (every component re-runs on every render, so the probe counts renders).
// This is the one spec that is about the rendering machinery, so it waits with
// nextRender() and asserts what has and has not rendered at each point.
describe('App scheduling (one rAF render per tick)', () => {
  let env, renders;
  const Probe = () => { renders++; return h('i', null); };
  const entries = [
    { id: 1, date: '2024-01-01', text: 'first entry' },
    { id: 2, date: '2024-01-02', text: 'second entry' }
  ];

  beforeEach(async () => {
    fetchMock.restore();
    mockUnmatchedFail();
    localStorage.clear();
    await idbClear();
    resetDataFetched();
    saveAccounts([{ id: 99, username: 'alice', active: true }]);
    history.replaceState(null, null, '/entries');
    renders = 0;
    env = mount(h('div', null, h(App, null), h(Probe, null)), { state: { entries } });
    await nextRender(); // let mount-time writes (router onChange, measurements) render
    renders = 0;
  });

  afterEach(async () => {
    env.cleanup();
    env = null;
    await nextRender();
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    history.replaceState(null, null, '/');
    document.body.classList.remove('dark');
  });

  it('a store write does not touch the DOM synchronously; it lands on the next frame', async () => {
    expect(env.getByText('first entry')).to.exist;
    app.entries = [{ id: 3, date: '2024-01-03', text: 'third entry' }];
    expect(viewEntries().length, 'watchers ran synchronously').to.equal(1);
    expect(env.queryByText('third entry'), 'not rendered yet').to.be.null;
    expect(env.getByText('first entry')).to.exist;
    expect(renders).to.equal(0);

    await Promise.resolve();
    expect(env.queryByText('third entry'), 'not on a microtask either: only on a frame').to.be.null;

    await nextRender();
    expect(env.getByText('third entry')).to.exist;
    expect(env.queryByText('first entry')).to.be.null;
    expect(renders).to.equal(1);
  });

  it('several writes in one tick (plus their watcher writes) produce a single render', async () => {
    app.sort = 'asc';
    app.filterText = 'entry';
    app.dark = true;
    app.dialogMode = 'menu';
    expect(renders).to.equal(0);

    await nextRender();
    expect(renders, 'one coalesced render').to.equal(1);
    expect(env.getByText('Light'), 'menu rendered with dark on').to.exist;
    expect(env.getByText('Latest'), 'menu rendered with asc sort').to.exist;
  });

  it('an unchanged write schedules nothing', async () => {
    app.sort = app.sort;
    app.dialogMode = '';
    await nextRender();
    expect(renders).to.equal(0);
  });

  it('a click renders nothing synchronously, then exactly once on the next frame', async () => {
    fireEvent.click(env.getByRole('button', { name: 'Menu' }));
    expect(app.dialogMode).to.equal('menu');
    expect(env.queryByText('Logout'), 'not rendered by the event itself').to.be.null;
    await nextRender();
    expect(env.getByText('Logout')).to.exist;
    expect(renders).to.equal(1);

    fireEvent.click(env.getByText('Dark'));
    expect(app.dark).to.be.true;
    expect(document.body.classList.contains('dark')).to.be.true;

    await nextRender();
    expect(renders, 'both writes of the click coalesced').to.equal(2);
    expect(env.queryByText('Logout'), 'toggleDarkMode closed the menu').to.be.null;
  });
});
