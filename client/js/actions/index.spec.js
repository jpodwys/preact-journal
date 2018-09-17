import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
  
describe('actions', () => {
  let el;
  const cb = function(){};

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
        const delta = { key: 'bogus', val: 'value', cb: cb };
        Global.linkstate(el, delta);
        expect(el.set.args[0][0][delta.key]).to.equal(delta.val);
      });

    });

  });

  describe('userActions', () => {

    describe('login', () => {

      it('should', () => {

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
