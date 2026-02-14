import fetchMock from 'fetch-mock';
import User from './user-service';
import Entry from './entry-service';

describe('services', () => {

  describe('userService', () => {
    const fakeUser = { username: 'u', password: 'p' };

    afterEach(() => {
      fetchMock.restore();
    });

    it('should call the create endpoint with a user object', async () => {
      fetchMock.post('/api/user', 204);
      await User.create(fakeUser);
      const options = fetchMock.lastOptions();
      expect(typeof options.body).to.equal('string');
      expect(JSON.parse(options.body).username).to.equal('u');
    });

    it('should call the login endpoint with a user object', async () => {
      fetchMock.post('/api/user/login', 204);
      User.login(fakeUser);
      const options = fetchMock.lastOptions();
      expect(typeof options.body).to.equal('string');
      expect(JSON.parse(options.body).username).to.equal('u');
    });

    it('should call the logout endpoint', async () => {
      fetchMock.post('/api/user/logout', 204);
      await User.logout();
    });
      
  });

  describe('entryService', () => {
    const fakeEntry = { date: '1234', text: 'bogus' };
    
    afterEach(() => {
      fetchMock.restore();
    });

    it('should call the getAll endpoint', async () => {
      fetchMock.get('/api/entries', 204);
      await Entry.getAll();
    });

    it('should call the sync endpoint', async () => {
      fetchMock.get('/api/entries/sync/1234', 204);
      await Entry.sync(1234);
    });

    it('should call the create endpoint with an entry object', async () => {
      fetchMock.post('/api/entry', 204);
      await Entry.create(fakeEntry)
      const options = fetchMock.lastOptions();
      expect(typeof options.body).to.equal('string');
      expect(JSON.parse(options.body).date).to.equal('1234');
    });

    it('should call the update endpoint with an entry object', async () => {
      fetchMock.patch('/api/entry/1234', 204);
      await Entry.update(1234, fakeEntry);
      const options = fetchMock.lastOptions();
      expect(typeof options.body).to.equal('string');
      expect(JSON.parse(options.body).date).to.equal('1234');
    });

    it('should call the del endpoint', async () => {
      fetchMock.delete('/api/entry/1234', 204);
      await Entry.del(1234);
    });
      
  });

});
