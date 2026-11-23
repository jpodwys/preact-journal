import fetchMock from 'fetch-mock';
import { clear as idbClear } from 'idb-keyval';
import api from './index';
import { app, resetState } from '../app-state';
import { resetDataFetched } from '../actions/entry-actions';
import { getAccounts, saveAccounts } from '../../../test/accounts';
import { mockGetAllEntries } from '../../../test/api-mocks';

// `fire('handleExpiredSession')` is gone: api calls the real
// handleExpiredSession(userId) on a 401, so these tests assert its effect
// (accounts in localStorage, the store, and the route) instead of a spy.
describe('api', () => {
  const wait = (ms = 20) => new Promise(r => setTimeout(r, ms));

  function activate(accounts) {
    saveAccounts(accounts);
    resetState();
  }

  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('api-200', { hello: 'world' });
    fetchMock.get('api-204', 204);
    fetchMock.post('api-post-204', 204);
    fetchMock.get('api-401', 401);
    fetchMock.get('api-500', 500);
    localStorage.clear();
    await idbClear();
    resetDataFetched();
    resetState();
    history.replaceState(null, '', '/entries');
  });

  afterEach(async () => {
    await fetchMock.flush();
    await wait();
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    resetState();
    history.replaceState(null, '', '/');
  });

  it('should make a GET and resolve with the parsed JSON', async () => {
    const data = await api('api-200');
    expect(data.hello).to.equal('world');
  });

  it('should set credentials and default JSON headers on every request', async () => {
    await api('api-200');
    const options = fetchMock.lastOptions();
    expect(options.credentials).to.equal('same-origin');
    expect(options.headers['Content-Type']).to.equal('application/json');
    expect(options.headers['Accept']).to.equal('application/json');
    // No active account, so no X-User-Id header is added.
    // Guards against a 4th default header sneaking in unnoticed.
    expect(Object.keys(options.headers).length).to.equal(2);
  });

  it('should send the active userId as X-User-Id', async () => {
    activate([{ id: 42, username: 'test', active: true }]);
    await api('api-200');
    expect(fetchMock.lastOptions().headers['X-User-Id']).to.equal('42');
  });

  it('should leave data undefined on a 204', async () => {
    const data = await api('api-204');
    expect(data).to.be.undefined;
  });

  it('should JSON-stringify request bodies', async () => {
    await api('api-post-204', { method: 'POST', body: { a: 'a' } });
    const options = fetchMock.lastOptions();
    expect(typeof options.body).to.equal('string');
    expect(JSON.parse(options.body).a).to.equal('a');
  });

  it('should expire the active account and log out on a 401 when no other account remains', async () => {
    activate([{ id: 42, username: 'test', active: true }]);
    expect(app.loggedIn).to.be.true;

    await api('api-401').catch(() => {});

    expect(getAccounts()).to.deep.equal([{ id: 42, username: 'test', active: false, expired: true }]);
    expect(app.loggedIn).to.be.false;
    expect(app.userId).to.equal('');
    expect(location.pathname).to.equal('/');
  });

  it('should switch to the next valid account on a 401 when one remains', async () => {
    mockGetAllEntries({ entries: [] });
    activate([
      { id: 42, username: 'test', active: true },
      { id: 7, username: 'other', active: false }
    ]);

    await api('api-401').catch(() => {});
    await wait(); // switchAccount reads IndexedDB before writing the store

    const accounts = getAccounts();
    expect(accounts.find(a => a.id === 42)).to.include({ expired: true, active: false });
    expect(accounts.find(a => a.id === 7).active).to.be.true;
    expect(app.userId).to.equal('7');
    expect(app.username).to.equal('other');
    expect(location.pathname).to.equal('/entries');
  });

  it('should not expire the session when skipAuth is true', async () => {
    const accounts = [{ id: 42, username: 'test', active: true }];
    activate(accounts);
    await api('api-401', {}, { skipAuth: true }).catch(() => {});
    expect(getAccounts()).to.deep.equal(accounts);
    expect(app.loggedIn).to.be.true;
    expect(location.pathname).to.equal('/entries');
  });

  it('should re-throw the error after handling 401', async () => {
    activate([{ id: 42, username: 'test', active: true }]);
    const err = await api('api-401').then(() => null, e => e);
    expect(err.status).to.equal(401);
  });

  it('should not expire the session on non-401 errors', async () => {
    const accounts = [{ id: 42, username: 'test', active: true }];
    activate(accounts);
    const err = await api('api-500').then(() => null, e => e);
    expect(err.status).to.equal(500);
    expect(getAccounts()).to.deep.equal(accounts);
    expect(app.loggedIn).to.be.true;
  });

  it('should do nothing on a 401 when no active account exists (empty userId)', async () => {
    const accounts = [{ id: 42, username: 'test', active: false }];
    activate(accounts);
    await api('api-401').catch(() => {});
    expect(fetchMock.lastOptions().headers['X-User-Id']).to.be.undefined;
    expect(getAccounts()).to.deep.equal(accounts);
    expect(location.pathname).to.equal('/entries');
  });

  it('should ignore a 401 for a user the app has already switched away from', async () => {
    // The request is made as account 42, but the store is on account 7.
    const accounts = [{ id: 42, username: 'test', active: true }];
    activate(accounts);
    app.userId = '7';
    await api('api-401').catch(() => {});
    expect(getAccounts()).to.deep.equal(accounts);
    expect(app.userId).to.equal('7');
    expect(location.pathname).to.equal('/entries');
  });
});
