import { Provider, fire } from './index';

describe('unifire', () => {

  describe('Provider', () => {
    it('should have set, render, and setState methods', () => {
      const provider = new Provider({
        state: {},
        actions: {},
        children: []
      });

      expect(typeof provider.set).to.equal('function');
      expect(typeof provider.render).to.equal('function');
      expect(typeof provider.setState).to.equal('function');
    });

    it('should merge state when calling set', () => {
      const provider = new Provider({
        state: {},
        actions: {},
        children: []
      });

      provider.set({ a: 'z', b: 'b' });
      expect(provider.state.a).to.equal('z');
      expect(provider.state.b).to.equal('b');

      provider.set({ a: 'y', b: 'b' });
      expect(provider.state.a).to.equal('y');
      expect(provider.state.b).to.equal('b');
    });

    it('should listen for the UNIFIRE event on the document and execute the appropriate actions with the appropriate arguments', (done) => {
      const action1 = sinon.spy();
      const action2 = sinon.spy();
      const action3 = sinon.spy();
      const provider = new Provider({
        state: {},
        actions: { action1, action2 },
        children: []
      });
      const payload = {};
      const e = {};

      fire('action1', payload)();
      fire('action2', payload)(e);

      setTimeout(() => {
        expect(action1.calledOnce).to.be.true;
        expect(action1.calledWithExactly(provider, payload, undefined)).to.be.true;
        expect(action2.calledOnce).to.be.true;
        expect(action2.calledWithExactly(provider, payload, e)).to.be.true;
        expect(action3.calledOnce).to.be.false;
        done();
      });
    });
  });

  describe('fire', () => {

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
