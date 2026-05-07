import fetchMock from 'fetch-mock';
import api from './index';
import { Provider } from '../../components/unifire';

describe('api', () => {
  let handleExpiredSession;

  before(() => {
    fetchMock.get('api-200', { hello: 'world' });
    fetchMock.get('api-204', 204);
    fetchMock.post('api-post-204', 204);
    fetchMock.get('api-401', 401);
    fetchMock.get('api-500', 500);
  });

  after(() => {
    fetchMock.restore();
  });

  beforeEach(() => {
    localStorage.clear();
    handleExpiredSession = sinon.spy();
    new Provider({
      state: {},
      actions: { handleExpiredSession },
      children: []
    });
  });

  it('should make a GET and return { data, userId } with parsed JSON', async () => {
    const response = await api('api-200');
    expect(response.data.hello).to.equal('world');
    expect(response.userId).to.be.a('string');
  });

  it('should set credentials and default JSON headers on every request', async () => {
    await api('api-200');
    const options = fetchMock.lastOptions();
    expect(options.credentials).to.equal('same-origin');
    expect(options.headers['Content-Type']).to.equal('application/json');
    expect(options.headers['Accept']).to.equal('application/json');
  });

  it('should leave data undefined on a 204', async () => {
    const response = await api('api-204');
    expect(response.data).to.be.undefined;
  });

  it('should JSON-stringify request bodies', async () => {
    await api('api-post-204', { method: 'POST', body: { a: 'a' } });
    const options = fetchMock.lastOptions();
    expect(typeof options.body).to.equal('string');
    expect(JSON.parse(options.body).a).to.equal('a');
  });

  it('should fire handleExpiredSession with the active userId on 401', (done) => {
    var accounts = [{ id: 42, username: 'test', active: true }];
    localStorage.setItem('accounts', JSON.stringify(accounts));
    api('api-401').catch(() => {
      expect(handleExpiredSession.calledOnce).to.be.true;
      expect(handleExpiredSession.args[0][1]).to.equal('42');
      done();
    });
  });

  it('should not fire handleExpiredSession when skipAuth is true', (done) => {
    var accounts = [{ id: 42, username: 'test', active: true }];
    localStorage.setItem('accounts', JSON.stringify(accounts));
    api('api-401', {}, { skipAuth: true }).catch(() => {
      expect(handleExpiredSession.called).to.be.false;
      done();
    });
  });

  it('should re-throw the error after handling 401', (done) => {
    api('api-401').catch(err => {
      expect(err.status).to.equal(401);
      done();
    });
  });

  it('should not fire handleExpiredSession on non-401 errors', (done) => {
    api('api-500').catch(() => {
      expect(handleExpiredSession.called).to.be.false;
      done();
    });
  });

  it('should pass an empty userId when no active account exists', (done) => {
    api('api-401').catch(() => {
      expect(handleExpiredSession.args[0][1]).to.equal('');
      done();
    });
  });
});
