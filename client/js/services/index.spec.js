import fetchMock from 'fetch-mock';
import User from './user-service';
import Entry from './entry-service';

describe('services', () => {

  describe('userService', () => {
    const fakeUser = { username: 'u', password: 'p' };

    afterEach(() => {
      fetchMock.restore();
    });

    it('should call the create endpoint with a user object', (done) => {
      fetchMock.post('/api/user', 204);
      User.create(fakeUser).then(() => {
        const options = fetchMock.lastOptions();
        expect(typeof options.body).to.equal('string');
        expect(JSON.parse(options.body).username).to.equal('u');
        done();
      }).catch(done);
    });

    it('should call the login endpoint with a user object', (done) => {
      fetchMock.post('/api/user/login', 204);
      User.login(fakeUser).then(() => {
        const options = fetchMock.lastOptions();
        expect(typeof options.body).to.equal('string');
        expect(JSON.parse(options.body).username).to.equal('u');
        done();
      }).catch(done);
    });

    it('should call the logout endpoint', (done) => {
      fetchMock.post('/api/user/logout', 204);
      User.logout().then(done).catch(done);
    });
      
  });

  describe('entryService', () => {
    const fakeEntry = { date: '1234', text: 'bogus' };
    
    afterEach(() => {
      fetchMock.restore();
    });

    it('should call the getAll endpoint', (done) => {
      fetchMock.get('/api/entries', 204);
      Entry.getAll().then(done).catch(done);
    });

    it('should call the sync endpoint', (done) => {
      fetchMock.get('/api/entries/sync/1234', 204);
      Entry.sync(1234).then(done).catch(done);
    });

    it('should call the create endpoint with an entry object', (done) => {
      fetchMock.post('/api/entry', 204);
      Entry.create(fakeEntry).then(() => {
        const options = fetchMock.lastOptions();
        expect(typeof options.body).to.equal('string');
        expect(JSON.parse(options.body).date).to.equal('1234');
        done();
      }).catch(done);
    });

    it('should call the update endpoint with an entry object', (done) => {
      fetchMock.patch('/api/entry/1234', 204);
      Entry.update(1234, fakeEntry).then(() => {
        const options = fetchMock.lastOptions();
        expect(typeof options.body).to.equal('string');
        expect(JSON.parse(options.body).date).to.equal('1234');
        done();
      }).catch(done);
    });

    it('should call the del endpoint', (done) => {
      fetchMock.delete('/api/entry/1234', 204);
      Entry.del(1234).then(done).catch(done);
    });
      
  });

});
