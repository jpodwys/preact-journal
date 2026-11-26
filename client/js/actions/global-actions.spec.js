import fetchMock from 'fetch-mock';
import { app, selected } from '../app-state';
import { toggleDarkMode, handleRouteChange } from './global-actions';
import { resetAll, seed, preserveLocation, ACCOUNT_1 } from './spec-helpers';

describe('globalActions', () => {
  preserveLocation();

  beforeEach(() => resetAll());
  afterEach(() => fetchMock.restore());

  describe('toggleDarkMode', () => {
    afterEach(() => document.body.classList.remove('dark'));

    it('flips dark and clears dialogMode', () => {
      seed({ dark: false, dialogMode: 'menu' });
      toggleDarkMode();
      expect(app.dark).to.be.true;
      expect(app.dialogMode).to.equal('');

      app.dialogMode = 'menu';
      toggleDarkMode();
      expect(app.dark).to.be.false;
      expect(app.dialogMode).to.equal('');
    });

    it('persists the preference to localStorage and the body class (via the store watcher)', () => {
      seed({ dark: false });
      toggleDarkMode();
      expect(localStorage.getItem('dark')).to.equal('true');
      expect(document.body.classList.contains('dark')).to.be.true;

      toggleDarkMode();
      expect(localStorage.getItem('dark')).to.equal('false');
      expect(document.body.classList.contains('dark')).to.be.false;
    });

  });

  describe('handleRouteChange', () => {
    let replaceSpy;
    beforeEach(() => { replaceSpy = sinon.spy(history, 'replaceState'); });
    afterEach(() => replaceSpy.restore());

    const replacedWith = () => replaceSpy.args.map(a => a[2]);

    it('should set view when appropriate', () => {
      const view = app.view;
      handleRouteChange('/entries'); // logged out: bounced before view is set
      expect(app.view).to.equal(view);

      handleRouteChange('/');
      expect(app.view).to.equal('/');
    });

    it('resets dialogMode when the view changes (store watcher)', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      seed({ view: '/entries', dialogMode: 'menu' });
      handleRouteChange('/search/');
      expect(app.view).to.equal('/search');
      expect(app.dialogMode).to.equal('');
    });

    it('should route back to / when passed an unknown path', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      handleRouteChange('/bogus');
      expect(replacedWith()).to.deep.equal(['/']);
      expect(location.pathname).to.equal('/');
    });

    it('should route back to / while logged out', () => {
      handleRouteChange('/entries');
      expect(replacedWith()).to.deep.equal(['/']);
    });

    it('should route to /entries when visiting / while logged in', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      handleRouteChange('/');
      expect(replacedWith()).to.deep.equal(['/entries']);
      expect(location.pathname).to.equal('/entries');
    });

    it('should remove a blank new entry from the front of entries when going to /entries', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });

      // (The original also ran this with entries undefined; the store's
      // viewEntries watcher requires an array, so entries is never undefined.)
      handleRouteChange('/entries');
      expect(app.entries).to.deep.equal([]);

      const written = [{ id: 1, date: '2020-01-01', text: 'hi' }];
      app.entries = written;
      handleRouteChange('/entries');
      expect(app.entries).to.equal(written);

      const typedNew = [{ id: 2, date: '2020-01-02', newEntry: true, text: 'typed' }];
      app.entries = typedNew;
      handleRouteChange('/entries');
      expect(app.entries).to.equal(typedNew);

      app.entries = [{ id: 3, date: '2020-01-03', newEntry: true, text: '' }, written[0]];
      handleRouteChange('/entries');
      expect(app.entries.map(e => e.id)).to.deep.equal([1]);
    });

    it('also discards a blank new entry when going to /search', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      app.entries = [{ id: 3, date: '2020-01-03', newEntry: true, text: '' }];
      handleRouteChange('/search/');
      expect(app.entries).to.deep.equal([]);
    });

    it('should create and select a new entry on /entry/new', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      app.entries = [{ id: 1, date: '2000-01-01', text: 'old' }];
      handleRouteChange('/entry/new');
      expect(app.view).to.equal('/new');
      expect(app.entries.length).to.equal(2);
      expect(app.entries[0].newEntry).to.be.true;
      expect(selected()[0]).to.equal(app.entries[0]);
      expect(selected()[1]).to.equal(0);
    });

    it('should not redirect on /switch while logged in', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      handleRouteChange('/switch');
      expect(replaceSpy.called).to.be.false;
      expect(app.view).to.equal('/switch');
    });

    it('should redirect to / on /switch while logged out', () => {
      handleRouteChange('/switch');
      expect(replacedWith()).to.deep.equal(['/']);
    });

    it('should select the entry on /entry/:id', async () => {
      await resetAll({ accounts: [ACCOUNT_1] });
      app.entries = [
        { id: 20, date: '2020-01-02', text: 'b' },
        { id: 10, date: '2020-01-01', text: 'a' }
      ];
      handleRouteChange('/entry/10');
      expect(app.view).to.equal('/entry');
      expect(selected()[0].id).to.equal(10);
      expect(selected()[1]).to.equal(1);
    });

  });

});
