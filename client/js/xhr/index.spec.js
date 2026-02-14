import fetchMock from 'fetch-mock';
import xhr from './index';

describe('xhr', () => {
  before(() => {
    fetchMock.get('get-200', { hello: 'world' });
    fetchMock.get('get-204', 204);
    fetchMock.post('post-204', 204);
    fetchMock.get('get-300', 300);
  });

  after(() => {
    fetchMock.restore();
  });

  it('should make a GET request and receive a response that is automatically parsed as JSON', async () => {
    const response = await xhr('get-200');
    expect(response.hello).to.equal('world');
  });

  it('should add default config', async () => {
    await xhr('get-200');
    const options = fetchMock.lastOptions();
    expect(options.credentials).to.equal('same-origin');
    expect(Object.keys(options.headers).length).to.equal(2);
    expect(options.headers['Content-Type']).to.equal('application/json');
    expect(options.headers['Accept']).to.equal('application/json');
  });

  it('should simply resolve on a 204', async () => {
    const response = xhr('get-204');
    expect(response).to.be.empty;
  });
  
  it('should automatically stringify request bodies', async () => {
    await xhr('get-204', { body: { a: 'a' } });
    const options = fetchMock.lastOptions();
    expect(typeof options.body).to.equal('string');
    expect(JSON.parse(options.body).a).to.equal('a');
  });

  it('should send a POST request', async () => {
    await xhr('post-204', { method: 'POST' });
  });

  it('should automatically reject on response codes >= 300', (done) => {
    xhr('get-300').then(() => {
      done(new Error('xhr should have rejected'));
    }).catch(() => {
      done();
    });
  });
    
});
