import { Provider, fire } from './index';
import TestUtils from '../../../test/test-utils';

describe.only('unifire', () => {

  describe('Provider', () => {
    const state = { a: 'a' };
    const provider = new Provider({
      state,
      actions: {},
      children: []
    });

    const ACTION = 'unifireProvider';
    const TU = new TestUtils(ACTION);

    beforeEach(TU.beforeEach);
    afterEach(TU.afterEach);

    it('should have set, render, setState, and forceUpdate methods', () => {
      expect(typeof provider.set).to.equal('function');
      expect(typeof provider.render).to.equal('function');
      expect(typeof provider.setState).to.equal('function');
      expect(typeof provider.forceUpdate).to.equal('function');
      expect(provider.state.a).to.equal(state.a);
    });

    it('should merge state when calling set', () => {
      provider.set({ a: 'z', b: 'b' });
      expect(state.a).to.equal('z');
      expect(state.b).to.equal('b');

      provider.set({ a: 'y', b: 'b' });
      expect(state.a).to.equal('y');
      expect(state.b).to.equal('b');
    });

    it('should listen for the UNIFIRE event on the document and execute the appropriate actions', (done) => {
      const action1 = sinon.spy();
      const action2 = sinon.spy();
      new Provider({
        state: {},
        actions: { action1, action2 },
        children: []
      });

      fire('action1')();
      fire('action2')();

      setTimeout(() => {
        expect(action1.calledOnce).to.be.true;
        expect(action2.calledOnce).to.be.true;
        done();
      });
    });
  });

  describe('fire', () => {
    const ACTION = 'unifireFire';
    const TU = new TestUtils(ACTION);

    beforeEach(TU.beforeEach);
    afterEach(TU.afterEach);

    it('should return a function without firing an event', (done) => {
      expect(typeof fire(ACTION, null, TU.node)).to.equal('function');
      setTimeout(() => {
        expect(TU.cb.calledOnce).to.be.false;
        done();
      });
    });

    it('should fire NAME event with the provided ACTION when calling the returned function', (done) => {
      fire(ACTION, null, TU.node)();
      setTimeout(() => {
        expect(TU.cb.calledOnce).to.be.true;
        done();
      });
    });

    it('should expose data in the following format to e.detail: { detail: [ action, detail, e ] }', (done) => {
      const DETAIL = { a: 'a' };
      const E = { type: 'mouse' };
      fire(ACTION, DETAIL, TU.node)(E);
      setTimeout(() => {
        expect(TU.cb.calledOnce).to.be.true;
        const args = TU.cb.args[0];
        expect(args[0].a).to.equal(DETAIL.a);
        expect(args[1].type).to.equal(E.type);
        done();
      });
    });
  });
  
});
