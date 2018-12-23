import { Provider, fire } from './index';

describe('unifire', () => {
  const NAME = 'UNIFIRE';
  const ACTION = 'BOGUS';
  const handler = (e) => {
    if(e.detail[0] === ACTION){
      cb(e.detail[1], e.detail[2]);
    }
  };
  let cb;

  beforeEach(() => {
    cb = sinon.spy();
    document.addEventListener(NAME, handler);
  });

  afterEach(() => {
    document.removeEventListener(NAME, handler);
  });

  /**
   * I CAN'T TEST PROVIDER RIGHT NOW. IT ATTACHES A UNIFIRE EVENT LISTENER
   * WHICH ENDS UP OVERWRITING EVENT LISTENERS FROM OTHER TESTS. IF I EXPORT
   * THE LISTEN FUNCTION AND MAKE IT ACCEPT THE EVENT NAME PARAM, THEN I CAN
   * TEST IT INDEPENDENTLY. I COULD ALSO MOVE THE MERGE FUNCTION BACK INTO
   * THE UTILS FILE. BUT EVEN THEN, I'M NOT SURE HOW I'LL TEST PROVIDER.
   */
  // describe('Provider', () => {
  //   it('should have set, reset, and render methods', () => {
  //     const provider = new Provider({
  //       state: {},
  //       actions: {},
  //       children: []
  //     });
  //     expect(typeof provider.set).to.equal('function');
  //     expect(typeof provider.reset).to.equal('function');
  //     expect(typeof provider.render).to.equal('function');
  //   });
  // });

  describe('fire', () => {
    it('should return a function without firing an event', (done) => {
      expect(typeof fire(ACTION)).to.equal('function');
      setTimeout(() => {
        expect(cb.calledOnce).to.be.false;
        done();
      });
    });

    it('should fire NAME event with the provided ACTION when calling the returned function', (done) => {
      fire(ACTION)();
      setTimeout(() => {
        expect(cb.calledOnce).to.be.true;
        done();
      });
    });

    it('should expose data in the following format to e.detail: { detail: [ action, detail, e ] }', (done) => {
      const DETAIL = { a: 'a' };
      const E = { type: 'mouse' };
      fire(ACTION, DETAIL)(E);
      setTimeout(() => {
        expect(cb.calledOnce).to.be.true;
        const args = cb.args[0];
        expect(args[0].a).to.equal(DETAIL.a);
        expect(args[1].type).to.equal(E.type);
        done();
      });
    });
  });
  
});
