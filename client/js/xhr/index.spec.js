import fetchMock from 'fetch-mock';
import xhr from './index';

describe('xhr', () => {
  fetchMock.get('get-200', { hello: 'world' });
  fetchMock.get('get-204', 204);
  fetchMock.post('post-204', 204);
  fetchMock.get('get-300', 300);

  it('should make a GET request and receive a response that is automatically parsed as JSON', (done) => {
    xhr('get-200').then((response) => {
      expect(response.hello).to.equal('world');
      done();
    }).catch(done);
  });

  it('should add default config', (done) => {
    xhr('get-200').then((response) => {
      const options = fetchMock.lastOptions();
      expect(options.credentials).to.equal('same-origin');
      expect(Object.keys(options.headers).length).to.equal(2);
      expect(options.headers['Content-Type']).to.equal('application/json');
      expect(options.headers['Accept']).to.equal('application/json');
      done();
    }).catch(done);
  });

  it('should simply resolve on a 204', (done) => {
    xhr('get-204').then((response) => {
      expect(response).to.be.undefined;
      done();
    }).catch(done);
  });
  
  it('should automatically stringify request bodies', (done) => {
    xhr('get-204', { body: { a: 'a' } }).then(() => {
      const options = fetchMock.lastOptions();
      expect(typeof options.body).to.equal('string');
      done();
    }).catch(done);
  });

  it('should send a POST request', (done) => {
    xhr('post-204', { method: 'POST' }).then(done).catch(done);
  });

  it('should automatically reject on response codes >= 300', (done) => {
    xhr('get-300').then(() => {
      done(new Error('xhr should have rejected'));
    }).catch(() => {
      done();
    });
  });
    
});
