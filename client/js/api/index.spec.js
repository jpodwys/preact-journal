import fetchMock from 'fetch-mock';
import api from './index';
import { Provider } from '../../components/unifire';

describe('api', () => {
  let handleExpiredSession;

  before(() => {
    fetchMock.get('api-200', { hello: 'world' });
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

  it('should pass requests through to xhr and return the response', async () => {
    const response = await api('api-200');
    expect(response.hello).to.equal('world');
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
