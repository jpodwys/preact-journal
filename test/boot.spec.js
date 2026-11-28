import fetchMock from 'fetch-mock';
import { clear as idbClear, set as idbSet } from 'idb-keyval';
import { fireEvent, getByText, queryByText, getByRole, queryByRole, findByText, within, networkIdle, sleep } from './mount';
import { saveAccounts } from './accounts';
import { resetState } from '../client/js/app-state';
import { mockSyncEntries, mockUnmatchedFail } from './api-mocks';

// Real bootstrap smoke test: imports the shipped entry (client/js/index.js),
// which renders <App/> into document.body on import.
// One scenario per page run (the entry executes once per page):
//   BOOT_SCENARIO=in  npx karma start test/karma.boot.conf.js --single-run
//   BOOT_SCENARIO=out npx karma start test/karma.boot.conf.js --single-run
const scenario = (window.__karma__.config.args || [])[0] || 'in';
const body = () => document.body;

describe('bootstrap (client/js/index.js) — ' + scenario, () => {
  let registerStub, errors, bodyBefore, restoreConsole, onError, onRejection;

  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.config.overwriteRoutes = true;
    localStorage.clear();
    await idbClear();


    // No real service worker registration.
    registerStub = sinon.stub(navigator.serviceWorker, 'register').resolves();

    errors = [];
    onError = e => errors.push('error: ' + e.message);
    onRejection = e => errors.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    const origConsoleError = console.error;
    console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); };
    restoreConsole = () => { console.error = origConsoleError; };

    bodyBefore = Array.from(document.body.childNodes);
  });

  afterEach(async () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    restoreConsole();
    registerStub.restore();
    // Remove everything the entry rendered into <body>; keep karma's own nodes.
    Array.from(document.body.childNodes)
      .filter(n => !bodyBefore.includes(n))
      .forEach(n => n.remove());
    document.body.className = '';
    document.body.onscroll = null;
    history.replaceState(null, '', '/context.html');
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
  });

  if(scenario === 'in') {
    it('logged-in boot renders entries, registers /sw.js once, navigates to an entry', async () => {
      saveAccounts([{ id: 99, username: 'alice', active: true }]);
      await idbSet('entries_99', [
        { id: 1, date: '2024-01-01', text: 'first boot entry' },
        { id: 2, date: '2024-01-02', text: 'second boot entry' }
      ]);
      localStorage.setItem('timestamp_99', '1000');
      mockSyncEntries({ entries: [], timestamp: 2000 });
      mockUnmatchedFail();
      history.replaceState(null, '', '/entries');

      // The store singleton was built when the bundle loaded (before this test seeded
      // localStorage); in production it is built once with the real values.
      resetState();
      require('../client/js/index.js');

      await findByText(body(), '2 Entries'); // header count, once the cached entries are in
      expect(getByRole(body(), 'link', { name: /first boot entry/ }), 'entry visible').to.exist;
      expect(getByRole(body(), 'link', { name: /second boot entry/ })).to.exist;
      expect(queryByText(body(), 'Login'), 'no login page').to.be.null;

      expect(registerStub.callCount, 'register calls').to.equal(1);
      expect(registerStub.firstCall.args[0]).to.equal('/sw.js');

      fireEvent.click(getByRole(body(), 'link', { name: /first boot entry/ }));
      // The page header gets a delete button on the entry view (the list rows have their own).
      const banner = getByRole(body(), 'banner');
      await within(banner).findByRole('button', { name: 'Delete entry' });
      expect(location.pathname).to.equal('/entry/1');
      expect(getByText(body(), 'first boot entry'), 'entry text shown').to.exist;

      await networkIdle();
      expect(fetchMock.calls('unmatched'), 'no unexpected network calls').to.have.length(0);
      expect(errors, 'no errors recorded').to.deep.equal([]);
    });
  } else {
    it('logged-out boot renders only the Login page', async () => {
      mockUnmatchedFail();
      history.replaceState(null, '', '/');

      // The store singleton was built when the bundle loaded (before this test seeded
      // localStorage); in production it is built once with the real values.
      resetState();
      require('../client/js/index.js');
      await findByText(body(), 'Login');
      // This test is mostly about what does NOT happen during boot, which nothing on screen signals: give it a window.
      await sleep(100);
      expect(getByRole(body(), 'form'), 'login form').to.exist;
      expect(getByRole(body(), 'textbox'), 'username field').to.exist;
      expect(queryByText(body(), /Entries$/), 'no entries header').to.be.null;
      expect(body().querySelectorAll('.entry-preview')).to.have.length(0);
      expect(queryByRole(body(), 'link', { name: /entry/i })).to.be.null;

      expect(registerStub.callCount, 'register calls').to.equal(1);
      expect(registerStub.firstCall.args[0]).to.equal('/sw.js');
      expect(fetchMock.calls('unmatched'), 'no network calls').to.have.length(0);
      expect(errors, 'no errors recorded').to.deep.equal([]);
    });
  }

  after(async () => {
    // Nothing leaked: body is back to karma's nodes and no real SW registered.
    expect(Array.from(document.body.childNodes)).to.deep.equal(bodyBefore);
    const regs = await navigator.serviceWorker.getRegistrations();
    expect(regs, 'no leftover service worker registrations').to.have.length(0);
  });
});
