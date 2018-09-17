import fetchMock from 'fetch-mock';
import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
  
describe('actions', () => {
  let el;

  function getElStub() {
    return { set: sinon.spy() };
  };

  beforeEach(() => {
    el = getElStub();
  });

  afterEach(() => {

  });

  describe('globalActions', () => {

    describe('linkstate', () => {

      it('should call set on the provided el mock with the correct params', () => {
        const cb = function(){};
        const delta = { key: 'bogus', val: 'value', cb: cb };
        Global.linkstate(el, delta);
        expect(el.set.args[0][0][delta.key]).to.equal(delta.val);
      });

    });

  });

  describe('userActions', () => {

    afterEach(() => {
      fetchMock.restore();
    });

    describe('login', () => {

      it('should clear localStorage, login, and route to /entries', (done) => {
        fetchMock.post('/api/user/login', Promise.resolve({ status: 204 }));
        localStorage.setItem('bogus', 'value');
        User.login(el, { username: 'bogus', password: 'value' });
        setTimeout(() => {
          expect(localStorage.getItem('bogus')).to.be.null;
          expect(el.set.called).to.be.true;
          expect(el.set.args[0][0].loggedIn).to.be.true;
          expect(typeof el.set.args[0][1]).to.equal('function');
          done();
        });
      });

    });

  });

  describe('entryActions', () => {

    describe('getEntries', () => {

      it('should', () => {
        
      });

    });

  });

});
